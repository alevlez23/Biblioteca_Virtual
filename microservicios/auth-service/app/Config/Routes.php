<?php
/*
 * Definición de rutas del microservicio de autenticación.
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
        'servicio' => 'Microservicio de autenticación',
        'version'  => '1.0.0',
        'estado'   => 'activo',
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
        // Agrupo los endpoints de acceso bajo /api/auth para mantener una URL
        // coherente: login, perfil y logout.
        $routes->group(
            'api/auth',
            static function (RouteCollection $routes): void {
                $routes->post('login', 'Auth::login');
                $routes->get('perfil', 'Auth::perfil');
                $routes->post('logout', 'Auth::logout');
            }
        );

        // Respuesta vacía para la verificación OPTIONS que realiza el navegador.
        $routes->options(
            'api/auth/(:any)',
            static function () {
                return service('response')
                    ->setStatusCode(204);
            }
        );
    }
);