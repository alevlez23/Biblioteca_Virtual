<?php
/*
 * Controlador del inicio de sesión, perfil y cierre de sesión.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Controllers;

use App\Models\AdministradorModel;
use CodeIgniter\HTTP\ResponseInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;
use Throwable;

class Auth extends BaseController
{
    /**
     * Lee el cuerpo enviado por React.
     *
     * La API normalmente recibe JSON, pero dejo getPost como respaldo para que
     * el controlador también pueda probarse con formularios tradicionales.
     */
    private function leerDatos(): array
    {
        $datos = $this->request->getJSON(true);

        if (! is_array($datos)) {
            $datos = $this->request->getPost();
        }

        return is_array($datos) ? $datos : [];
    }

    /**
     * Convierte los posibles valores booleanos devueltos por PostgreSQL.
     *
     * Dependiendo del controlador y del driver, true puede llegar como booleano,
     * número o texto. Esta normalización evita desactivar una cuenta válida por
     * una diferencia de formato.
     */
    private function estaActivo(mixed $valor): bool
    {
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
     * Obtiene la clave privada utilizada para firmar y verificar los JWT.
     * La clave se lee desde .env y nunca se envía al frontend ni se escribe en
     * el repositorio.
     */
    private function obtenerClaveJwt(): string
    {
        $clave = trim(
            (string) env(
                'AUTH_JWT_SECRET'
            )
        );

        if ($clave === '') {
            throw new RuntimeException(
                'La clave JWT no está configurada.'
            );
        }

        return $clave;
    }

    /**
     * Obtiene la duración del token en segundos.
     * Si la variable no existe o contiene un valor inválido, utiliza una hora.
     */
    private function obtenerDuracionToken(): int
    {
        $duracion = (int) env(
            'AUTH_JWT_EXPIRATION',
            3600
        );

        return $duracion > 0
            ? $duracion
            : 3600;
    }

    /**
     * Extrae el token del encabezado Authorization: Bearer <token>.
     * Rechaza encabezados vacíos o con un formato distinto.
     */
    private function obtenerToken(): string
    {
        $autorizacion = trim(
            $this->request->getHeaderLine(
                'Authorization'
            )
        );

        if (
            ! preg_match(
                '/^Bearer\s+(\S+)$/i',
                $autorizacion,
                $coincidencias
            )
        ) {
            throw new RuntimeException(
                'No se proporcionó un token de acceso.'
            );
        }

        return $coincidencias[1];
    }

    /**
     * POST /api/auth/login
     *
     * Flujo del acceso:
     * 1. Lee y valida usuario y contraseña.
     * 2. Busca el administrador con coincidencia exacta del usuario.
     * 3. Verifica el hash de la contraseña y el estado de la cuenta.
     * 4. Construye un JWT firmado con HS256.
     * 5. Actualiza la fecha del último acceso y devuelve la sesión.
     */
    public function login(): ResponseInterface
    {
        try {
            $datos = $this->leerDatos();

            $usuario = trim(
                (string) (
                    $datos['usuario']
                    ?? ''
                )
            );

            $contrasena = (string) (
                $datos['contrasena']
                ?? ''
            );

            if (
                $usuario === ''
                || $contrasena === ''
            ) {
                return $this->response
                    ->setStatusCode(422)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'El usuario y la contraseña son obligatorios.',
                    ]);
            }

            $administradorModel =
                new AdministradorModel();

            /*
             * La comparación es exacta. De esta manera la cuenta oficial
             * "alejandra" debe escribirse en minúsculas, tal como está guardada
             * en PostgreSQL.
             */
            $administrador = $administradorModel
                ->where('usuario', $usuario)
                ->first();

            if (
                $administrador === null
                || ! password_verify(
                    $contrasena,
                    $administrador[
                        'password_hash'
                    ]
                )
            ) {
                return $this->response
                    ->setStatusCode(401)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'El usuario o la contraseña son incorrectos.',
                    ]);
            }

            if (
                ! $this->estaActivo(
                    $administrador['activo']
                    ?? false
                )
            ) {
                return $this->response
                    ->setStatusCode(403)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'La cuenta del administrador está desactivada.',
                    ]);
            }

            $fechaActual = time();

            $duracion =
                $this->obtenerDuracionToken();

            $fechaExpiracion =
                $fechaActual + $duracion;

            // Datos estándar del token: emisor, audiencia, tiempos de validez,
            // identificador del administrador y perfil mínimo.
            $cargaUtil = [
                'iss' =>
                    'biblioteca-virtual',

                'aud' =>
                    'biblioteca-virtual-frontend',

                'iat' => $fechaActual,
                'nbf' => $fechaActual,
                'exp' => $fechaExpiracion,

                'sub' =>
                    (string) $administrador['id'],

                'administrador' => [
                    'id' =>
                        (int) $administrador['id'],

                    'nombre' =>
                        $administrador['nombre'],

                    'usuario' =>
                        $administrador['usuario'],

                    'rol' =>
                        $administrador['rol'],
                ],
            ];

            // HS256 firma el contenido con la misma clave que validan los demás servicios.
            $token = JWT::encode(
                $cargaUtil,
                $this->obtenerClaveJwt(),
                'HS256'
            );

            /*
             * Se registra la fecha del último acceso.
             */
            $administradorModel->update(
                $administrador['id'],
                [
                    'ultimo_acceso' =>
                        date('Y-m-d H:i:s'),
                ]
            );

            return $this->response
                ->setStatusCode(200)
                ->setJSON([
                    'estado' => 'correcto',

                    'mensaje' =>
                        'Inicio de sesión correcto.',

                    'token' => $token,

                    'tipo' => 'Bearer',

                    'expira_en' =>
                        $fechaExpiracion,

                    'administrador' => [
                        'id' =>
                            (int) $administrador['id'],

                        'nombre' =>
                            $administrador['nombre'],

                        'usuario' =>
                            $administrador['usuario'],

                        'rol' =>
                            $administrador['rol'],
                    ],
                ]);
        } catch (Throwable $error) {
            return $this->errorInterno(
                $error
            );
        }
    }

    /**
     * GET /api/auth/perfil
     *
     * Decodifica el JWT, obtiene el identificador guardado en sub y consulta de
     * nuevo al administrador. Esta segunda consulta evita confiar únicamente en
     * datos antiguos incluidos dentro del token.
     */
    public function perfil(): ResponseInterface
    {
        try {
            $token =
                $this->obtenerToken();

            $contenido = JWT::decode(
                $token,
                new Key(
                    $this->obtenerClaveJwt(),
                    'HS256'
                )
            );

            $administradorId =
                filter_var(
                    $contenido->sub ?? null,
                    FILTER_VALIDATE_INT,
                    [
                        'options' => [
                            'min_range' => 1,
                        ],
                    ]
                );

            if ($administradorId === false) {
                return $this->response
                    ->setStatusCode(401)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'El token no contiene un administrador válido.',
                    ]);
            }

            $administradorModel =
                new AdministradorModel();

            $administrador =
                $administradorModel->find(
                    (int) $administradorId
                );

            if (
                $administrador === null
                || ! $this->estaActivo(
                    $administrador['activo']
                    ?? false
                )
            ) {
                return $this->response
                    ->setStatusCode(401)
                    ->setJSON([
                        'estado' => 'error',
                        'mensaje' =>
                            'La sesión no corresponde a una cuenta activa.',
                    ]);
            }

            return $this->response->setJSON([
                'estado' => 'correcto',

                'administrador' => [
                    'id' =>
                        (int) $administrador['id'],

                    'nombre' =>
                        $administrador['nombre'],

                    'usuario' =>
                        $administrador['usuario'],

                    'rol' =>
                        $administrador['rol'],

                    'ultimo_acceso' =>
                        $administrador[
                            'ultimo_acceso'
                        ]
                        ?? null,
                ],
            ]);
        } catch (Throwable) {
            return $this->response
                ->setStatusCode(401)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El token es inválido o ha expirado.',
                ]);
        }
    }

    /**
     * POST /api/auth/logout
     *
     * Un JWT no mantiene una sesión de servidor que deba destruirse. El cierre
     * real ocurre cuando React elimina el token; este endpoint confirma la
     * operación y mantiene una API consistente.
     */
    public function logout(): ResponseInterface
    {
        return $this->response->setJSON([
            'estado' => 'correcto',
            'mensaje' =>
                'Sesión cerrada correctamente.',
        ]);
    }

    /**
     * Centraliza los errores inesperados en una respuesta JSON.
     * El detalle técnico solo se muestra en desarrollo para no revelar datos
     * internos cuando la aplicación se publique.
     */
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