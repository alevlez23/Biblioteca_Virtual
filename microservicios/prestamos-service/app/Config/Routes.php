<?php
/*
 * Definición de rutas del microservicio de préstamos.
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
        'servicio' =>
            'Microservicio de prestamos',
        'version' => '1.0.0',
        'estado' => 'activo',
        'puerto' => 8083,
    ]);
});

// Health comprueba que PHP y PostgreSQL estén disponibles.
$routes->get(
    'health',
    'Health::index'
);

// El filtro CORS se aplica al grupo completo para permitir solicitudes desde
// el frontend local y responder correctamente las peticiones preflight.
$routes->group(
    '',
    [
        'filter' => 'cors',
    ],
    static function (
        RouteCollection $routes
    ): void {
        /*
         * Solicitudes previas enviadas
         * automáticamente por el navegador.
         */
        // Peticiones preflight necesarias para POST y PATCH desde React.
        $routes->options(
            'api/prestamos',
            static function () {
                return service('response')
                    ->setStatusCode(204);
            }
        );

        $routes->options(
            'api/prestamos/(:any)',
            static function () {
                return service('response')
                    ->setStatusCode(204);
            }
        );

        /*
         * Rutas protegidas por JWT.
         */
        // Estas rutas administran movimientos y exigen un JWT válido.
        $routes->group(
            'api/prestamos',
            [
                'filter' => 'jwtAuth',
            ],
            static function (
                RouteCollection $routes
            ): void {
                $routes->get(
                    '',
                    'Prestamos::index'
                );

                $routes->get(
                    '(:num)',
                    'Prestamos::mostrar/$1'
                );

                $routes->post(
                    '',
                    'Prestamos::crear'
                );

                $routes->patch(
                    '(:num)/devolucion',
                    'Prestamos::devolver/$1'
                );
            }
        );
    }
);