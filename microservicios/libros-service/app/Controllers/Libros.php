<?php
/*
 * Controlador CRUD e inventario del microservicio de libros.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Controllers;

use App\Models\LibroModel;
use CodeIgniter\HTTP\ResponseInterface;
use RuntimeException;
use Throwable;

class Libros extends BaseController
{
    /** Lee el cuerpo JSON o un formulario tradicional. */
    private function leerDatos(): array
    {
        $datos = $this->request->getJSON(true);

        if (! is_array($datos)) {
            $datos = $this->request->getPost();
        }

        return is_array($datos) ? $datos : [];
    }

    /** Valida que el identificador sea un entero positivo. */
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

    /** Normaliza el estado activo devuelto por PostgreSQL. */
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

    /** Convierte cantidades, año y estado a tipos consistentes para React. */
    private function normalizarLibro(
        array $libro
    ): array {
        return [
            'id' => (int) $libro['id'],
            'titulo' => $libro['titulo'],
            'autor' => $libro['autor'],
            'isbn' => $libro['isbn'],
            'categoria' =>
                $libro['categoria'] ?? 'General',
            'editorial' =>
                $libro['editorial'] ?? '',
            'anio_publicacion' =>
                $libro['anio_publicacion'] !== null
                    ? (int) $libro['anio_publicacion']
                    : null,
            'cantidad_total' =>
                (int) $libro['cantidad_total'],
            'ejemplares_disponibles' =>
                (int) $libro[
                    'ejemplares_disponibles'
                ],
            'activo' =>
                $this->convertirBooleano(
                    $libro['activo'] ?? false
                ),
            'fecha_registro' =>
                $libro['fecha_registro'] ?? null,
            'fecha_actualizacion' =>
                $libro['fecha_actualizacion'] ?? null,
        ];
    }

    /**
     * Valida información bibliográfica e inventario. También impide repetir el
     * ISBN, ignorando diferencias de mayúsculas y excluyendo el libro editado.
     */
    private function validarDatos(
        array $datos,
        ?int $libroId = null
    ): array {
        $errores = [];

        $titulo = trim(
            (string) ($datos['titulo'] ?? '')
        );

        $autor = trim(
            (string) ($datos['autor'] ?? '')
        );

        $isbn = trim(
            (string) ($datos['isbn'] ?? '')
        );

        $categoria = trim(
            (string) (
                $datos['categoria']
                ?? 'General'
            )
        );

        $editorial = trim(
            (string) ($datos['editorial'] ?? '')
        );

        $anioPublicacion =
            $datos['anio_publicacion'] ?? null;

        $cantidadTotal =
            $datos['cantidad_total'] ?? 1;

        // Validaciones de textos, año, cantidad e ISBN.
        if (mb_strlen($titulo) < 2) {
            $errores[] =
                'El título debe contener al menos dos caracteres.';
        }

        if (mb_strlen($titulo) > 180) {
            $errores[] =
                'El título no puede superar los 180 caracteres.';
        }

        if (mb_strlen($autor) < 2) {
            $errores[] =
                'El autor debe contener al menos dos caracteres.';
        }

        if (mb_strlen($autor) > 150) {
            $errores[] =
                'El autor no puede superar los 150 caracteres.';
        }

        if ($isbn === '') {
            $errores[] =
                'Escribe el ISBN del libro.';
        }

        if (mb_strlen($isbn) > 30) {
            $errores[] =
                'El ISBN no puede superar los 30 caracteres.';
        }

        if ($categoria === '') {
            $categoria = 'General';
        }

        if (mb_strlen($categoria) > 100) {
            $errores[] =
                'La categoría no puede superar los 100 caracteres.';
        }

        if (mb_strlen($editorial) > 120) {
            $errores[] =
                'La editorial no puede superar los 120 caracteres.';
        }

        if (
            $anioPublicacion !== null
            && $anioPublicacion !== ''
        ) {
            if (
                filter_var(
                    $anioPublicacion,
                    FILTER_VALIDATE_INT
                ) === false
            ) {
                $errores[] =
                    'El año de publicación debe ser un número entero.';
            } else {
                $anioPublicacion =
                    (int) $anioPublicacion;

                $anioMaximo =
                    (int) date('Y') + 1;

                if (
                    $anioPublicacion < 1000
                    || $anioPublicacion >
                        $anioMaximo
                ) {
                    $errores[] =
                        'El año de publicación no es válido.';
                }
            }
        } else {
            $anioPublicacion = null;
        }

        if (
            filter_var(
                $cantidadTotal,
                FILTER_VALIDATE_INT
            ) === false
            || (int) $cantidadTotal < 0
        ) {
            $errores[] =
                'La cantidad total debe ser un número entero igual o mayor que cero.';
        } else {
            $cantidadTotal =
                (int) $cantidadTotal;
        }

        if ($isbn !== '') {
            $modelo = new LibroModel();

            /*
             * El ISBN queda escapado y entre comillas
             * antes de enviarse a PostgreSQL.
             */
            $isbnEscapado =
                db_connect()->escape($isbn);

            $consulta = $modelo->where(
                "LOWER(isbn) = LOWER({$isbnEscapado})",
                null,
                false
            );

            if ($libroId !== null) {
                $consulta->where(
                    'id !=',
                    $libroId
                );
            }

            if ($consulta->first() !== null) {
                $errores[] =
                    'Ya existe un libro con ese ISBN.';
            }
        }

        return [
            'errores' => $errores,

            'datos' => [
                'titulo' => $titulo,
                'autor' => $autor,
                'isbn' => $isbn,
                'categoria' => $categoria,
                'editorial' =>
                    $editorial !== ''
                        ? $editorial
                        : null,
                'anio_publicacion' =>
                    $anioPublicacion,
                'cantidad_total' =>
                    $cantidadTotal,
            ],
        ];
    }

    /** GET /api/libros: lista el catálogo y suma existencias disponibles. */
    public function index(): ResponseInterface
    {
        try {
            $modelo = new LibroModel();

            $libros = $modelo
                ->orderBy('id', 'DESC')
                ->findAll();

            $libros = array_map(
                fn (array $libro): array =>
                    $this->normalizarLibro(
                        $libro
                    ),
                $libros
            );

            $totalDisponibles = array_sum(
                array_column(
                    $libros,
                    'ejemplares_disponibles'
                )
            );

            return $this->response->setJSON([
                'estado' => 'correcto',
                'total' => count($libros),
                'ejemplares_disponibles' =>
                    $totalDisponibles,
                'libros' => $libros,
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /** GET /api/libros/{id}: devuelve un título específico. */
    public function mostrar(
        $id
    ): ResponseInterface {
        if (! $this->idValido($id)) {
            return $this->response
                ->setStatusCode(400)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El identificador del libro no es válido.',
                ]);
        }

        try {
            $modelo = new LibroModel();

            $libro = $modelo->find((int) $id);

            if ($libro === null) {
                return $this->response
                    ->setStatusCode(404)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'Libro no encontrado.',
                    ]);
            }

            return $this->response->setJSON([
                'estado' => 'correcto',
                'libro' =>
                    $this->normalizarLibro(
                        $libro
                    ),
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /**
     * POST /api/libros: registra un título. Al crearlo, la disponibilidad inicial
     * es igual a la cantidad total porque todavía no existen préstamos.
     */
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

            $modelo = new LibroModel();
            $fecha = date('Y-m-d H:i:s');

            $cantidadTotal =
                $validacion['datos'][
                    'cantidad_total'
                ];

            $id = $modelo->insert(
                [
                    ...$validacion['datos'],
                    'ejemplares_disponibles' =>
                        $cantidadTotal,
                    'activo' => true,
                    'fecha_registro' => $fecha,
                    'fecha_actualizacion' =>
                        $fecha,
                ],
                true
            );

            if ($id === false) {
                throw new RuntimeException(
                    'PostgreSQL no pudo registrar el libro.'
                );
            }

            $libro = $modelo->find((int) $id);

            return $this->response
                ->setStatusCode(201)
                ->setJSON([
                    'estado' => 'correcto',
                    'mensaje' =>
                        'Libro registrado correctamente.',
                    'libro' =>
                        $this->normalizarLibro(
                            $libro
                        ),
                ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /**
     * PUT /api/libros/{id}: actualiza datos y recalcula existencias sin perder la
     * cantidad de ejemplares que actualmente están prestados.
     */
    public function actualizar(
        $id
    ): ResponseInterface {
        if (! $this->idValido($id)) {
            return $this->response
                ->setStatusCode(400)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El identificador del libro no es válido.',
                ]);
        }

        try {
            $id = (int) $id;

            $modelo = new LibroModel();

            $libroActual = $modelo->find($id);

            if ($libroActual === null) {
                return $this->response
                    ->setStatusCode(404)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'Libro no encontrado.',
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

            $cantidadAnterior =
                (int) $libroActual[
                    'cantidad_total'
                ];

            $disponiblesAnteriores =
                (int) $libroActual[
                    'ejemplares_disponibles'
                ];

            // Los ejemplares prestados se conservan aunque cambie la cantidad total.
            $prestados = max(
                0,
                $cantidadAnterior -
                    $disponiblesAnteriores
            );

            $nuevaCantidad =
                $validacion['datos'][
                    'cantidad_total'
                ];

            if ($nuevaCantidad < $prestados) {
                return $this->response
                    ->setStatusCode(422)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'La cantidad total no puede ser menor que los ejemplares actualmente prestados.',
                    ]);
            }

            $nuevosDisponibles =
                $nuevaCantidad - $prestados;

            $resultado = $modelo->update(
                $id,
                [
                    ...$validacion['datos'],
                    'ejemplares_disponibles' =>
                        $nuevosDisponibles,
                    'fecha_actualizacion' =>
                        date('Y-m-d H:i:s'),
                ]
            );

            if ($resultado === false) {
                throw new RuntimeException(
                    'PostgreSQL no pudo actualizar el libro.'
                );
            }

            $libro = $modelo->find($id);

            return $this->response->setJSON([
                'estado' => 'correcto',
                'mensaje' =>
                    'Libro actualizado correctamente.',
                'libro' =>
                    $this->normalizarLibro(
                        $libro
                    ),
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /** PATCH /api/libros/{id}/estado: activa o desactiva el libro. */
    public function cambiarEstado(
        $id
    ): ResponseInterface {
        if (! $this->idValido($id)) {
            return $this->response
                ->setStatusCode(400)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El identificador del libro no es válido.',
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

            $modelo = new LibroModel();

            if ($modelo->find($id) === null) {
                return $this->response
                    ->setStatusCode(404)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'Libro no encontrado.',
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
                throw new RuntimeException(
                    'PostgreSQL no pudo cambiar el estado del libro.'
                );
            }

            $libro = $modelo->find($id);

            return $this->response->setJSON([
                'estado' => 'correcto',
                'mensaje' => $datos['activo']
                    ? 'Libro activado correctamente.'
                    : 'Libro desactivado correctamente.',
                'libro' =>
                    $this->normalizarLibro(
                        $libro
                    ),
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /**
     * PATCH /api/libros/{id}/disponibilidad: suma o resta una unidad durante un
     * préstamo o devolución y evita valores menores a cero o mayores al total.
     */
    public function ajustarDisponibilidad(
        $id
    ): ResponseInterface {
        if (! $this->idValido($id)) {
            return $this->response
                ->setStatusCode(400)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El identificador del libro no es válido.',
                ]);
        }

        $datos = $this->leerDatos();

        if (
            ! array_key_exists(
                'cambio',
                $datos
            )
            || filter_var(
                $datos['cambio'],
                FILTER_VALIDATE_INT
            ) === false
        ) {
            return $this->response
                ->setStatusCode(422)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El campo cambio debe ser un número entero.',
                ]);
        }

        try {
            $id = (int) $id;

            $modelo = new LibroModel();

            $libroActual = $modelo->find($id);

            if ($libroActual === null) {
                return $this->response
                    ->setStatusCode(404)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'Libro no encontrado.',
                    ]);
            }

            $cambio = (int) $datos['cambio'];

            $disponibles =
                (int) $libroActual[
                    'ejemplares_disponibles'
                ];

            $cantidadTotal =
                (int) $libroActual[
                    'cantidad_total'
                ];

            // La disponibilidad resultante siempre debe quedar dentro del inventario.
            $nuevoDisponible =
                $disponibles + $cambio;

            if (
                $nuevoDisponible < 0
                || $nuevoDisponible >
                    $cantidadTotal
            ) {
                return $this->response
                    ->setStatusCode(422)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'La disponibilidad resultante no es válida.',
                    ]);
            }

            $resultado = $modelo->update(
                $id,
                [
                    'ejemplares_disponibles' =>
                        $nuevoDisponible,
                    'fecha_actualizacion' =>
                        date('Y-m-d H:i:s'),
                ]
            );

            if ($resultado === false) {
                throw new RuntimeException(
                    'PostgreSQL no pudo actualizar la disponibilidad.'
                );
            }

            $libro = $modelo->find($id);

            return $this->response->setJSON([
                'estado' => 'correcto',
                'mensaje' =>
                    'Disponibilidad actualizada correctamente.',
                'libro' =>
                    $this->normalizarLibro(
                        $libro
                    ),
            ]);
        } catch (Throwable $error) {
            return $this->errorInterno($error);
        }
    }

    /** Devuelve errores inesperados en un formato JSON común. */
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