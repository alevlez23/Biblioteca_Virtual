<?php
/*
 * Definición de rutas del microservicio de usuarios.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// Ruta pública de presentación. Sirve para comprobar rápidamente qué
// microservicio respondió sin consultar la base de datos.
$routes->get('/', static function () {
    return service('response')->setJSON([
        'proyecto' => 'Biblioteca Virtual',
        'servicio' => 'Microservicio de usuarios',
        'version' => '1.0.0',
        'estado' => 'activo',
    ]);
});

// Health comprueba que PHP y PostgreSQL estén disponibles.
$routes->get('health', 'Health::index');

// El filtro CORS se aplica al grupo completo para permitir solicitudes desde
// el frontend local y responder correctamente las peticiones preflight.
$routes->group(
    '',
    ['filter' => 'cors'],
    static function (RouteCollection $routes): void {
        /*
         * Solicitudes OPTIONS enviadas automáticamente
         * por el navegador antes de POST, PUT o PATCH.
         */
        // El navegador envía OPTIONS antes de operaciones que modifican datos.
        $routes->options(
            'api/usuarios',
            static function () {
                return service('response')
                    ->setStatusCode(204);
            }
        );

        $routes->options(
            'api/usuarios/(:any)',
            static function () {
                return service('response')
                    ->setStatusCode(204);
            }
        );

        /*
         * Rutas protegidas con token JWT.
         */
        // Todas las operaciones CRUD quedan protegidas por jwtAuth. Si el token
        // falta, expiró o fue alterado, el controlador no llega a ejecutarse.
        $routes->group(
            'api/usuarios',
            ['filter' => 'jwtAuth'],
            static function (RouteCollection $routes): void {
                $routes->get('', 'Usuarios::index');

                $routes->get(
                    '(:num)',
                    'Usuarios::mostrar/$1'
                );

                $routes->post(
                    '',
                    'Usuarios::crear'
                );

                $routes->put(
                    '(:num)',
                    'Usuarios::actualizar/$1'
                );

                $routes->patch(
                    '(:num)/estado',
                    'Usuarios::cambiarEstado/$1'
                );
            }
        );
    }
);