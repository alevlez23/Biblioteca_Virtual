<?php
/*
 * Endpoint de diagnóstico del microservicio de usuarios.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Controllers;

use CodeIgniter\HTTP\ResponseInterface;
use Throwable;

class Health extends BaseController
{
    /** Comprueba PostgreSQL con SELECT 1 y devuelve el estado del servicio. */
    public function index(): ResponseInterface
    {
        try {
            $database = db_connect();
            $database->query('SELECT 1');

            return $this->response
                ->setStatusCode(200)
                ->setJSON([
                    'estado' => 'correcto',
                    'proyecto' => 'Biblioteca Virtual',
                    'servicio' => 'Usuarios',
                    'base_de_datos' => 'PostgreSQL conectado',
                    'fecha' => date('c'),
                ]);
        } catch (Throwable $error) {
            return $this->response
                ->setStatusCode(500)
                ->setJSON([
                    'estado' => 'error',
                    'proyecto' => 'Biblioteca Virtual',
                    'servicio' => 'Usuarios',
                    'base_de_datos' =>
                        'No fue posible conectar con PostgreSQL',
                    'detalle' => ENVIRONMENT === 'development'
                        ? $error->getMessage()
                        : 'Error interno del servidor.',
                ]);
        }
    }
}