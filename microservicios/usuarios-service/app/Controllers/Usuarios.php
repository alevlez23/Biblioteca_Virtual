<?php
/*
 * Controlador CRUD del microservicio de usuarios.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Controllers;

use App\Models\UsuarioModel;
use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class Usuarios extends BaseController
{
    /** Lee JSON o datos de formulario y siempre devuelve un arreglo. */
    private function leerDatos(): array
    {
        $datos = $this->request->getJSON(true);

        if (! is_array($datos)) {
            $datos = $this->request->getPost();
        }

        return is_array($datos) ? $datos : [];
    }

    /** Acepta únicamente identificadores enteros positivos. */
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

    /** Normaliza el booleano activo recibido desde PostgreSQL. */
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

    /**
     * Convierte tipos y completa valores opcionales antes de responder a React.
     * Así el frontend recibe siempre la misma estructura.
     */
    private function normalizarUsuario(
        array $usuario
    ): array {
        return [
            'id' => (int) $usuario['id'],
            'nombre' => $usuario['nombre'],
            'correo' => $usuario['correo'],
            'telefono' =>
                $usuario['telefono'] ?? '',
            'activo' =>
                $this->convertirBooleano(
                    $usuario['activo'] ?? false
                ),
            'fecha_registro' =>
                $usuario['fecha_registro'] ?? null,
            'fecha_actualizacion' =>
                $usuario['fecha_actualizacion'] ?? null,
        ];
    }

    /**
     * Limpia y valida nombre, correo y teléfono.
     * Cuando se edita, excluye el mismo id al comprobar correos duplicados.
     */
    private function validarDatos(
        array $datos,
        ?int $usuarioId = null
    ): array {
        $errores = [];

        $nombre = trim(
            (string) ($datos['nombre'] ?? '')
        );

        $correo = strtolower(
            trim(
                (string) ($datos['correo'] ?? '')
            )
        );

        $telefono = trim(
            (string) ($datos['telefono'] ?? '')
        );

        // Reglas de tamaño y formato aplicadas antes de tocar la base de datos.
        if (mb_strlen($nombre) < 2) {
            $errores[] =
                'El nombre debe contener al menos dos caracteres.';
        }

        if (mb_strlen($nombre) > 150) {
            $errores[] =
                'El nombre no puede superar los 150 caracteres.';
        }

        if ($correo === '') {
            $errores[] =
                'Escribe el correo electrónico.';
        } elseif (
            filter_var(
                $correo,
                FILTER_VALIDATE_EMAIL
            ) === false
        ) {
            $errores[] =
                'El correo electrónico no es válido.';
        }

        if (mb_strlen($correo) > 180) {
            $errores[] =
                'El correo no puede superar los 180 caracteres.';
        }

        if (mb_strlen($telefono) > 30) {
            $errores[] =
                'El teléfono no puede superar los 30 caracteres.';
        }

        // La búsqueda usa LOWER para impedir duplicados que solo cambien mayúsculas.
        if (
            $correo !== ''
            && filter_var(
                $correo,
                FILTER_VALIDATE_EMAIL
            ) !== false
        ) {
            $modelo = new UsuarioModel();

            /*
             * db_connect()->escape() agrega correctamente
             * las comillas necesarias para PostgreSQL.
             */
            $correoEscapado =
                db_connect()->escape($correo);

            $consulta = $modelo->where(
                "LOWER(correo) = LOWER({$correoEscapado})",
                null,
                false
            );

            if ($usuarioId !== null) {
                $consulta->where(
                    'id !=',
                    $usuarioId
                );
            }

            if ($consulta->first() !== null) {
                $errores[] =
                    'Ya existe un usuario con ese correo.';
            }
        }

        return [
            'errores' => $errores,

            'datos' => [
                'nombre' => $nombre,
                'correo' => $correo,
                'telefono' =>
                    $telefono !== ''
                        ? $telefono
                        : null,
            ],
        ];
    }

    /** GET /api/usuarios: lista lectores y calcula la cantidad de activos. */
    public function index(): ResponseInterface
    {
        try {
            $modelo = new UsuarioModel();

            // Los registros más recientes aparecen primero en la interfaz.
            $usuarios = $modelo
                ->orderBy('id', 'DESC')
                ->findAll();

            $usuarios = array_map(
                fn (array $usuario): array =>
                    $this->normalizarUsuario(
                        $usuario
                    ),
                $usuarios
            );

            $usuariosActivos = count(
                array_filter(
                    $usuarios,
                    fn (array $usuario): bool =>
                        $usuario['activo']
                )
            );

            return $this->response->setJSON([
                'estado' => 'correcto',
                'total' => count($usuarios),
                'usuarios_activos' =>
                    $usuariosActivos,
                'usuarios' => $usuarios,
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /** GET /api/usuarios/{id}: devuelve un lector o un error 404. */
    public function mostrar(
        $id
    ): ResponseInterface {
        if (! $this->idValido($id)) {
            return $this->response
                ->setStatusCode(400)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El identificador del usuario no es válido.',
                ]);
        }

        try {
            $modelo = new UsuarioModel();

            $usuario = $modelo->find((int) $id);

            if ($usuario === null) {
                return $this->response
                    ->setStatusCode(404)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'Usuario no encontrado.',
                    ]);
            }

            return $this->response->setJSON([
                'estado' => 'correcto',
                'usuario' =>
                    $this->normalizarUsuario(
                        $usuario
                    ),
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /** POST /api/usuarios: valida, inserta y devuelve el nuevo lector. */
    public function crear(): ResponseInterface
    {
        try {
            $validacion = $this->validarDatos(
                $this->leerDatos()
            );

            if ($validacion['errores'] !== []) {
                return $this->response
                    ->setStatusCode(422)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            $validacion['errores'][0],
                        'errores' =>
                            $validacion['errores'],
                    ]);
            }

            $modelo = new UsuarioModel();
            $fecha = date('Y-m-d H:i:s');

            // Se guardan fechas manualmente porque este modelo no usa timestamps automáticos.
            $id = $modelo->insert(
                [
                    ...$validacion['datos'],
                    'activo' => true,
                    'fecha_registro' => $fecha,
                    'fecha_actualizacion' =>
                        $fecha,
                ],
                true
            );

            if ($id === false) {
                throw new \RuntimeException(
                    'PostgreSQL no pudo registrar el usuario.'
                );
            }

            $usuario = $modelo->find((int) $id);

            return $this->response
                ->setStatusCode(201)
                ->setJSON([
                    'estado' => 'correcto',
                    'mensaje' =>
                        'Usuario registrado correctamente.',
                    'usuario' =>
                        $this->normalizarUsuario(
                            $usuario
                        ),
                ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /** PUT /api/usuarios/{id}: modifica un lector existente. */
    public function actualizar(
        $id
    ): ResponseInterface {
        if (! $this->idValido($id)) {
            return $this->response
                ->setStatusCode(400)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El identificador del usuario no es válido.',
                ]);
        }

        try {
            $id = (int) $id;

            $modelo = new UsuarioModel();

            $usuarioActual = $modelo->find($id);

            if ($usuarioActual === null) {
                return $this->response
                    ->setStatusCode(404)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'Usuario no encontrado.',
                    ]);
            }

            $validacion = $this->validarDatos(
                $this->leerDatos(),
                $id
            );

            if ($validacion['errores'] !== []) {
                return $this->response
                    ->setStatusCode(422)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            $validacion['errores'][0],
                        'errores' =>
                            $validacion['errores'],
                    ]);
            }

            $resultado = $modelo->update(
                $id,
                [
                    ...$validacion['datos'],
                    'fecha_actualizacion' =>
                        date('Y-m-d H:i:s'),
                ]
            );

            if ($resultado === false) {
                throw new \RuntimeException(
                    'PostgreSQL no pudo actualizar el usuario.'
                );
            }

            $usuario = $modelo->find($id);

            return $this->response->setJSON([
                'estado' => 'correcto',
                'mensaje' =>
                    'Usuario actualizado correctamente.',
                'usuario' =>
                    $this->normalizarUsuario(
                        $usuario
                    ),
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /** PATCH /api/usuarios/{id}/estado: activa o desactiva sin eliminar. */
    public function cambiarEstado(
        $id
    ): ResponseInterface {
        if (! $this->idValido($id)) {
            return $this->response
                ->setStatusCode(400)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El identificador del usuario no es válido.',
                ]);
        }

        $datos = $this->leerDatos();

        if (
            ! array_key_exists(
                'activo',
                $datos
            )
            || ! is_bool($datos['activo'])
        ) {
            return $this->response
                ->setStatusCode(422)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El campo activo debe ser verdadero o falso.',
                ]);
        }

        try {
            $id = (int) $id;

            $modelo = new UsuarioModel();

            if ($modelo->find($id) === null) {
                return $this->response
                    ->setStatusCode(404)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'Usuario no encontrado.',
                    ]);
            }

            $resultado = $modelo->update(
                $id,
                [
                    'activo' =>
                        $datos['activo'],
                    'fecha_actualizacion' =>
                        date('Y-m-d H:i:s'),
                ]
            );

            if ($resultado === false) {
                throw new \RuntimeException(
                    'PostgreSQL no pudo cambiar el estado del usuario.'
                );
            }

            $usuario = $modelo->find($id);

            return $this->response->setJSON([
                'estado' => 'correcto',
                'mensaje' => $datos['activo']
                    ? 'Usuario activado correctamente.'
                    : 'Usuario desactivado correctamente.',
                'usuario' =>
                    $this->normalizarUsuario(
                        $usuario
                    ),
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /** Devuelve un error 500 uniforme y protege detalles en producción. */
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