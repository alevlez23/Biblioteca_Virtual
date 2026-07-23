<?php
/*
 * Definición de rutas del microservicio de libros.
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
        'servicio' => 'Microservicio de libros',
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
         * Solicitudes OPTIONS enviadas por el navegador.
         */
        // El navegador envía OPTIONS antes de operaciones que modifican datos.
        $routes->options(
            'api/libros',
            static function () {
                return service('response')
                    ->setStatusCode(204);
            }
        );

        $routes->options(
            'api/libros/(:any)',
            static function () {
                return service('response')
                    ->setStatusCode(204);
            }
        );

        /*
         * Rutas protegidas mediante JWT.
         */
        // Todas las operaciones CRUD quedan protegidas por jwtAuth. Si el token
        // falta, expiró o fue alterado, el controlador no llega a ejecutarse.
        $routes->group(
            'api/libros',
            ['filter' => 'jwtAuth'],
            static function (RouteCollection $routes): void {
                $routes->get(
                    '',
                    'Libros::index'
                );

                $routes->get(
                    '(:num)',
                    'Libros::mostrar/$1'
                );

                $routes->post(
                    '',
                    'Libros::crear'
                );

                $routes->put(
                    '(:num)',
                    'Libros::actualizar/$1'
                );

                $routes->patch(
                    '(:num)/estado',
                    'Libros::cambiarEstado/$1'
                );

                $routes->patch(
                    '(:num)/disponibilidad',
                    'Libros::ajustarDisponibilidad/$1'
                );
            }
        );
    }
);