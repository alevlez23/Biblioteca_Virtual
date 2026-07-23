<?php
/*
 * Endpoint de diagnóstico del servicio de autenticación.
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
    /**
     * Ejecuta SELECT 1 para comprobar una conexión real con PostgreSQL y
     * devuelve un estado fácil de interpretar desde el navegador o la terminal.
     */
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
                    'servicio' => 'Autenticación',
                    'base_de_datos' => 'PostgreSQL conectado',
                    'fecha' => date('c'),
                ]);
        } catch (Throwable $error) {
            return $this->response
                ->setStatusCode(500)
                ->setJSON([
                    'estado' => 'error',
                    'proyecto' => 'Biblioteca Virtual',
                    'servicio' => 'Autenticación',
                    'base_de_datos' => 'No fue posible conectar con PostgreSQL',
                    'detalle' => ENVIRONMENT === 'development'
                        ? $error->getMessage()
                        : 'Error interno del servidor',
                ]);
        }
    }
}