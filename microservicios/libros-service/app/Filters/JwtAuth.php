<?php
/*
 * Filtro JWT del microservicio de libros.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;
use Throwable;

class JwtAuth implements FilterInterface
{
    /**
     * Se ejecuta antes del controlador.
     * Extrae el token Bearer, obtiene la clave compartida desde .env y valida la
     * firma y la fecha de expiración. Retornar una respuesta detiene la ruta;
     * retornar null permite continuar.
     */
    public function before(
        RequestInterface $request,
        $arguments = null
    ) {
        // El frontend coloca el JWT en el encabezado Authorization.
        $authorization = $request->getHeaderLine(
            'Authorization'
        );

        if (
            ! preg_match(
                '/Bearer\s+(\S+)/i',
                $authorization,
                $coincidencias
            )
        ) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'No se proporcionó un token de acceso.',
                ]);
        }

        // Firebase JWT también verifica automáticamente el campo exp del token.
        try {
            $clave = trim(
                (string) env('AUTH_JWT_SECRET')
            );

            if ($clave === '') {
                throw new RuntimeException(
                    'La clave JWT no está configurada.'
                );
            }

            JWT::decode(
                $coincidencias[1],
                new Key($clave, 'HS256')
            );

            return null;
        } catch (Throwable) {
            return service('response')
                ->setStatusCode(401)
                ->setJSON([
                    'estado' => 'error',
                    'mensaje' =>
                        'El token es inválido o ha expirado.',
                ]);
        }
    }

    /**
     * No se necesita modificar la respuesta después del controlador, por eso
     * este método requerido por FilterInterface devuelve null.
     */
    public function after(
        RequestInterface $request,
        ResponseInterface $response,
        $arguments = null
    ) {
        return null;
    }
}