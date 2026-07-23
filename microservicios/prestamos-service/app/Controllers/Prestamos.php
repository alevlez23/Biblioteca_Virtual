<?php
/*
 * Controlador de préstamos, devoluciones e integración entre servicios.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Controllers;

use App\Models\PrestamoModel;
use CodeIgniter\HTTP\ResponseInterface;
use RuntimeException;
use Throwable;

class Prestamos extends BaseController
{
    /** Lee el cuerpo enviado por React y devuelve un arreglo seguro. */
    private function leerDatos(): array
    {
        $datos = $this->request->getJSON(true);

        if (! is_array($datos)) {
            $datos = $this->request->getPost();
        }

        return is_array($datos) ? $datos : [];
    }

    /** Valida identificadores enteros positivos. */
    private function idValido(mixed $id): bool
    {
        return filter_var(
            $id,
            FILTER_VALIDATE_INT,
            [
                'options' => [
                    'min_range' => 1,
                ],
            ]
        ) !== false;
    }

    /** Normaliza estados booleanos recibidos de otras API. */
    private function convertirBooleano(
        mixed $valor
    ): bool {
        return in_array(
            $valor,
            [
                true,
                1,
                '1',
                't',
                'true',
                'TRUE',
            ],
            true
        );
    }

    /** Verifica formato YYYY-MM-DD y que el día exista en el calendario. */
    private function fechaValida(
        string $fecha
    ): bool {
        if (
            ! preg_match(
                '/^\d{4}-\d{2}-\d{2}$/',
                $fecha
            )
        ) {
            return false;
        }

        [$anio, $mes, $dia] = array_map(
            'intval',
            explode('-', $fecha)
        );

        return checkdate(
            $mes,
            $dia,
            $anio
        );
    }

    /** Recupera el mismo encabezado Bearer para reenviarlo a otros servicios. */
    private function obtenerAutorizacion(): string
    {
        return trim(
            $this->request->getHeaderLine(
                'Authorization'
            )
        );
    }

    /** Lee la URL de otro servicio desde .env y elimina la barra final. */
    private function obtenerUrlServicio(
        string $variable,
        string $predeterminado
    ): string {
        $url = trim(
            (string) env(
                $variable,
                $predeterminado
            )
        );

        return rtrim($url, '/');
    }

    /**
     * Realiza una solicitud HTTP interna con el token del usuario.
     * Decodifica JSON y transforma respuestas no exitosas en excepciones para
     * detener el préstamo antes de guardar datos inconsistentes.
     */
    private function solicitarServicio(
        string $metodo,
        string $url,
        ?array $contenido = null
    ): array {
        $autorizacion =
            $this->obtenerAutorizacion();

        if ($autorizacion === '') {
            throw new RuntimeException(
                'No se encontró el token de acceso.'
            );
        }

        // Se establece un tiempo máximo para que un servicio apagado no congele la API.
        $opciones = [
            'headers' => [
                'Accept' => 'application/json',
                'Authorization' =>
                    $autorizacion,
            ],
            'http_errors' => false,
            'timeout' => 8,
        ];

        if ($contenido !== null) {
            $opciones['json'] = $contenido;
        }

        $cliente = service('curlrequest');

        $respuesta = $cliente->request(
            strtoupper($metodo),
            $url,
            $opciones
        );

        $codigo = $respuesta->getStatusCode();

        $cuerpo = trim(
            $respuesta->getBody()
        );

        $datos = [];

        if ($cuerpo !== '') {
            $decodificado = json_decode(
                $cuerpo,
                true
            );

            if (is_array($decodificado)) {
                $datos = $decodificado;
            }
        }

        // Cualquier error del servicio relacionado se devuelve con su mensaje original.
        if ($codigo < 200 || $codigo >= 300) {
            throw new RuntimeException(
                (string) (
                    $datos['mensaje']
                    ?? $datos['detalle']
                    ?? 'Un microservicio relacionado rechazó la operación.'
                )
            );
        }

        return $datos;
    }

    /** Consulta usuarios-service y exige que la respuesta contenga usuario. */
    private function consultarUsuario(
        int $usuarioId
    ): array {
        $baseUrl = $this->obtenerUrlServicio(
            'USUARIOS_API_URL',
            'http://localhost:8081'
        );

        $respuesta =
            $this->solicitarServicio(
                'GET',
                "{$baseUrl}/api/usuarios/{$usuarioId}"
            );

        if (
            ! isset($respuesta['usuario'])
            || ! is_array(
                $respuesta['usuario']
            )
        ) {
            throw new RuntimeException(
                'El microservicio de usuarios no devolvió información válida.'
            );
        }

        return $respuesta['usuario'];
    }

    /** Consulta libros-service y exige que la respuesta contenga libro. */
    private function consultarLibro(
        int $libroId
    ): array {
        $baseUrl = $this->obtenerUrlServicio(
            'LIBROS_API_URL',
            'http://localhost:8082'
        );

        $respuesta =
            $this->solicitarServicio(
                'GET',
                "{$baseUrl}/api/libros/{$libroId}"
            );

        if (
            ! isset($respuesta['libro'])
            || ! is_array(
                $respuesta['libro']
            )
        ) {
            throw new RuntimeException(
                'El microservicio de libros no devolvió información válida.'
            );
        }

        return $respuesta['libro'];
    }

    /** Solicita a libros-service sumar o restar disponibilidad. */
    private function ajustarDisponibilidad(
        int $libroId,
        int $cambio
    ): array {
        $baseUrl = $this->obtenerUrlServicio(
            'LIBROS_API_URL',
            'http://localhost:8082'
        );

        return $this->solicitarServicio(
            'PATCH',
            "{$baseUrl}/api/libros/{$libroId}/disponibilidad",
            [
                'cambio' => $cambio,
            ]
        );
    }

    /** Marca como VENCIDO todo préstamo activo cuya fecha límite ya pasó. */
    private function actualizarVencidos(): void
    {
        db_connect()
            ->table('prestamos')
            ->where('estado', 'ACTIVO')
            ->where(
                'fecha_limite <',
                date('Y-m-d')
            )
            ->update([
                'estado' => 'VENCIDO',
                'fecha_actualizacion' =>
                    date('Y-m-d H:i:s'),
            ]);
    }

    /**
     * Convierte tipos y, cuando se solicita, completa el préstamo con datos del
     * usuario y del libro. Los respaldos permiten mostrar el historial aunque
     * uno de los otros servicios esté temporalmente fuera de línea.
     */
    private function normalizarPrestamo(
        array $prestamo,
        bool $consultarDetalles = true
    ): array {
        $resultado = [
            'id' => (int) $prestamo['id'],
            'usuario_id' =>
                (int) $prestamo['usuario_id'],
            'libro_id' =>
                (int) $prestamo['libro_id'],
            'fecha_prestamo' =>
                $prestamo['fecha_prestamo']
                ?? null,
            'fecha_limite' =>
                $prestamo['fecha_limite']
                ?? null,
            'fecha_devolucion' =>
                $prestamo['fecha_devolucion']
                ?? null,
            'estado' => strtoupper(
                (string) (
                    $prestamo['estado']
                    ?? 'ACTIVO'
                )
            ),
            'observaciones' =>
                $prestamo['observaciones']
                ?? '',
            'fecha_actualizacion' =>
                $prestamo[
                    'fecha_actualizacion'
                ]
                ?? null,
            'usuario' => null,
            'libro' => null,
        ];

        if (! $consultarDetalles) {
            return $resultado;
        }

        try {
            $usuario = $this->consultarUsuario(
                $resultado['usuario_id']
            );

            $resultado['usuario'] = [
                'id' => (int) $usuario['id'],
                'nombre' =>
                    $usuario['nombre'] ?? '',
                'correo' =>
                    $usuario['correo'] ?? '',
                'telefono' =>
                    $usuario['telefono'] ?? '',
                'activo' =>
                    $this->convertirBooleano(
                        $usuario['activo']
                        ?? false
                    ),
            ];
        } catch (Throwable $error) {
            $resultado['usuario'] = [
                'id' =>
                    $resultado['usuario_id'],
                'nombre' =>
                    'Usuario no disponible',
                'correo' => '',
                'telefono' => '',
                'activo' => false,
                'error' =>
                    $error->getMessage(),
            ];
        }

        try {
            $libro = $this->consultarLibro(
                $resultado['libro_id']
            );

            $resultado['libro'] = [
                'id' => (int) $libro['id'],
                'titulo' =>
                    $libro['titulo'] ?? '',
                'autor' =>
                    $libro['autor'] ?? '',
                'isbn' =>
                    $libro['isbn'] ?? '',
                'categoria' =>
                    $libro['categoria']
                    ?? 'General',
                'cantidad_total' =>
                    (int) (
                        $libro[
                            'cantidad_total'
                        ]
                        ?? 0
                    ),
                'ejemplares_disponibles' =>
                    (int) (
                        $libro[
                            'ejemplares_disponibles'
                        ]
                        ?? 0
                    ),
                'activo' =>
                    $this->convertirBooleano(
                        $libro['activo']
                        ?? false
                    ),
            ];
        } catch (Throwable $error) {
            $resultado['libro'] = [
                'id' => $resultado['libro_id'],
                'titulo' =>
                    'Libro no disponible',
                'autor' => '',
                'isbn' => '',
                'categoria' => '',
                'cantidad_total' => 0,
                'ejemplares_disponibles' => 0,
                'activo' => false,
                'error' =>
                    $error->getMessage(),
            ];
        }

        return $resultado;
    }

    /** GET /api/prestamos: actualiza vencidos y devuelve todos los movimientos. */
    public function index(): ResponseInterface
    {
        try {
            $this->actualizarVencidos();

            $modelo = new PrestamoModel();

            $prestamos = $modelo
                ->orderBy('id', 'DESC')
                ->findAll();

            $prestamos = array_map(
                fn (array $prestamo): array =>
                    $this->normalizarPrestamo(
                        $prestamo
                    ),
                $prestamos
            );

            $activos = 0;
            $devueltos = 0;
            $vencidos = 0;

            foreach ($prestamos as $prestamo) {
                switch ($prestamo['estado']) {
                    case 'DEVUELTO':
                        $devueltos++;
                        break;

                    case 'VENCIDO':
                        $vencidos++;
                        break;

                    default:
                        $activos++;
                        break;
                }
            }

            return $this->response->setJSON([
                'estado' => 'correcto',
                'total' => count($prestamos),
                'prestamos_activos' => $activos,
                'prestamos_devueltos' =>
                    $devueltos,
                'prestamos_vencidos' =>
                    $vencidos,
                'prestamos' => $prestamos,
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /** GET /api/prestamos/{id}: devuelve un movimiento con sus relaciones. */
    public function mostrar(
        $id
    ): ResponseInterface {
        if (! $this->idValido($id)) {
            return $this->response
                ->setStatusCode(400)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El identificador del préstamo no es válido.',
                ]);
        }

        try {
            $this->actualizarVencidos();

            $modelo = new PrestamoModel();

            $prestamo = $modelo->find(
                (int) $id
            );

            if ($prestamo === null) {
                return $this->response
                    ->setStatusCode(404)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'Préstamo no encontrado.',
                    ]);
            }

            return $this->response->setJSON([
                'estado' => 'correcto',
                'prestamo' =>
                    $this->normalizarPrestamo(
                        $prestamo
                    ),
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /**
     * POST /api/prestamos.
     *
     * 1. Valida usuario, libro, fecha y observaciones.
     * 2. Confirma con usuarios-service que el lector exista y esté activo.
     * 3. Confirma con libros-service que exista una unidad disponible.
     * 4. Evita préstamos pendientes duplicados.
     * 5. Descuenta la existencia y registra el movimiento en PostgreSQL.
     */
    public function crear(): ResponseInterface
    {
        $datos = $this->leerDatos();
        $errores = [];

        $usuarioId =
            $datos['usuario_id'] ?? null;

        $libroId =
            $datos['libro_id'] ?? null;

        $fechaLimite = trim(
            (string) (
                $datos['fecha_limite']
                ?? ''
            )
        );

        $observaciones = trim(
            (string) (
                $datos['observaciones']
                ?? ''
            )
        );

        if (! $this->idValido($usuarioId)) {
            $errores[] =
                'Selecciona un usuario válido.';
        } else {
            $usuarioId = (int) $usuarioId;
        }

        if (! $this->idValido($libroId)) {
            $errores[] =
                'Selecciona un libro válido.';
        } else {
            $libroId = (int) $libroId;
        }

        if ($fechaLimite === '') {
            $fechaLimite = date(
                'Y-m-d',
                strtotime('+14 days')
            );
        } elseif (
            ! $this->fechaValida(
                $fechaLimite
            )
        ) {
            $errores[] =
                'La fecha límite no es válida.';
        } elseif (
            $fechaLimite < date('Y-m-d')
        ) {
            $errores[] =
                'La fecha límite no puede ser anterior a hoy.';
        }

        if (
            mb_strlen($observaciones) > 255
        ) {
            $errores[] =
                'Las observaciones no pueden superar los 255 caracteres.';
        }

        if ($errores !== []) {
            return $this->response
                ->setStatusCode(422)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' => $errores[0],
                    'errores' => $errores,
                ]);
        }

        try {
            $usuario =
                $this->consultarUsuario(
                    $usuarioId
                );

            if (
                ! $this->convertirBooleano(
                    $usuario['activo']
                    ?? false
                )
            ) {
                return $this->response
                    ->setStatusCode(422)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'El usuario seleccionado está inactivo.',
                    ]);
            }

            $libro = $this->consultarLibro(
                $libroId
            );

            if (
                ! $this->convertirBooleano(
                    $libro['activo']
                    ?? false
                )
            ) {
                return $this->response
                    ->setStatusCode(422)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'El libro seleccionado está inactivo.',
                    ]);
            }

            if (
                (int) (
                    $libro[
                        'ejemplares_disponibles'
                    ]
                    ?? 0
                ) < 1
            ) {
                return $this->response
                    ->setStatusCode(422)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'No existen ejemplares disponibles de este libro.',
                    ]);
            }

            // Regla de negocio: un lector no puede tener el mismo libro pendiente dos veces.
            $prestamoExistente = db_connect()
                ->table('prestamos')
                ->where(
                    'usuario_id',
                    $usuarioId
                )
                ->where(
                    'libro_id',
                    $libroId
                )
                ->whereIn(
                    'estado',
                    [
                        'ACTIVO',
                        'VENCIDO',
                    ]
                )
                ->get()
                ->getRowArray();

            if ($prestamoExistente !== null) {
                return $this->response
                    ->setStatusCode(422)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'Este usuario ya tiene un préstamo pendiente del mismo libro.',
                    ]);
            }

            // Esta bandera permite compensar la operación si el INSERT falla después de
            // haber descontado la existencia en libros-service.
            $disponibilidadReducida = false;

            try {
                $this->ajustarDisponibilidad(
                    $libroId,
                    -1
                );

                $disponibilidadReducida = true;

                $modelo = new PrestamoModel();
                $fechaActual =
                    date('Y-m-d H:i:s');

                $id = $modelo->insert(
                    [
                        'usuario_id' =>
                            $usuarioId,
                        'libro_id' =>
                            $libroId,
                        'fecha_prestamo' =>
                            $fechaActual,
                        'fecha_limite' =>
                            $fechaLimite,
                        'fecha_devolucion' =>
                            null,
                        'estado' => 'ACTIVO',
                        'observaciones' =>
                            $observaciones !== ''
                                ? $observaciones
                                : null,
                        'fecha_actualizacion' =>
                            $fechaActual,
                    ],
                    true
                );

                if ($id === false) {
                    throw new RuntimeException(
                        'PostgreSQL no pudo registrar el préstamo.'
                    );
                }
            } catch (Throwable $error) {
                // Compensación: devuelve la unidad para no dejar ambos servicios desincronizados.
                if ($disponibilidadReducida) {
                    try {
                        $this
                            ->ajustarDisponibilidad(
                                $libroId,
                                1
                            );
                    } catch (Throwable) {
                        // Se conserva el error original.
                    }
                }

                throw $error;
            }

            $prestamo = (new PrestamoModel())
                ->find((int) $id);

            return $this->response
                ->setStatusCode(201)
                ->setJSON([
                    'estado' => 'correcto',
                    'mensaje' =>
                        'Préstamo registrado correctamente.',
                    'prestamo' =>
                        $this->normalizarPrestamo(
                            $prestamo
                        ),
                ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /**
     * PATCH /api/prestamos/{id}/devolucion.
     * Recupera una existencia del libro y marca el préstamo como DEVUELTO.
     */
    public function devolver(
        $id
    ): ResponseInterface {
        if (! $this->idValido($id)) {
            return $this->response
                ->setStatusCode(400)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El identificador del préstamo no es válido.',
                ]);
        }

        try {
            $this->actualizarVencidos();

            $id = (int) $id;

            $modelo = new PrestamoModel();

            $prestamoActual =
                $modelo->find($id);

            if ($prestamoActual === null) {
                return $this->response
                    ->setStatusCode(404)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'Préstamo no encontrado.',
                    ]);
            }

            if (
                strtoupper(
                    (string) $prestamoActual[
                        'estado'
                    ]
                ) === 'DEVUELTO'
            ) {
                return $this->response
                    ->setStatusCode(422)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'Este préstamo ya fue devuelto.',
                    ]);
            }

            $libroId = (int) (
                $prestamoActual['libro_id']
            );

            $libro = $this->consultarLibro(
                $libroId
            );

            $cantidadTotal = (int) (
                $libro['cantidad_total']
                ?? 0
            );

            $disponibles = (int) (
                $libro[
                    'ejemplares_disponibles'
                ]
                ?? 0
            );

            // La devolución también usa compensación si falla la actualización local.
            $disponibilidadAumentada = false;

            try {
                /*
                 * Los préstamos antiguos podrían no haber
                 * descontado la existencia. En ese caso no
                 * se aumenta por encima del total.
                 */
                if (
                    $disponibles <
                    $cantidadTotal
                ) {
                    $this
                        ->ajustarDisponibilidad(
                            $libroId,
                            1
                        );

                    $disponibilidadAumentada =
                        true;
                }

                $resultado = $modelo->update(
                    $id,
                    [
                        'estado' => 'DEVUELTO',
                        'fecha_devolucion' =>
                            date('Y-m-d H:i:s'),
                        'fecha_actualizacion' =>
                            date('Y-m-d H:i:s'),
                    ]
                );

                if ($resultado === false) {
                    throw new RuntimeException(
                        'PostgreSQL no pudo registrar la devolución.'
                    );
                }
            } catch (Throwable $error) {
                if ($disponibilidadAumentada) {
                    try {
                        $this
                            ->ajustarDisponibilidad(
                                $libroId,
                                -1
                            );
                    } catch (Throwable) {
                        // Se conserva el error original.
                    }
                }

                throw $error;
            }

            $prestamo = $modelo->find($id);

            return $this->response->setJSON([
                'estado' => 'correcto',
                'mensaje' =>
                    'Devolución registrada correctamente.',
                'prestamo' =>
                    $this->normalizarPrestamo(
                        $prestamo
                    ),
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /** Centraliza respuestas 500 y oculta detalles fuera de desarrollo. */
    private function errorInterno(
        Throwable $error
    ): ResponseInterface {
        return $this->response
            ->setStatusCode(500)
            ->setJSON([
                'estado' => 'error',
                'mensaje' =>
                    'No fue posible completar la operación.',
                'detalle' =>
                    ENVIRONMENT === 'development'
                        ? $error->getMessage()
                        : 'Error interno del servidor.',
            ]);
    }
}