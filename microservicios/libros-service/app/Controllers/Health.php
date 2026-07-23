<?php
/*
 * Endpoint de diagnóstico del microservicio de libros.
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
    /** Comprueba conexión, tabla libros y cantidad de registros existentes. */
    public function index(): ResponseInterface
    {
        try {
            $database = db_connect();

            $database->query('SELECT 1');

            $cantidadLibros = $database
                ->table('libros')
                ->countAllResults();

            return $this->response
                ->setStatusCode(200)
                ->setJSON([
                    'estado' => 'correcto',
                    'proyecto' => 'Biblioteca Virtual',
                    'servicio' => 'Libros',
                    'base_de_datos' =>
                        'PostgreSQL conectado',
                    'tabla_libros' => 'disponible',
                    'total_registros' =>
                        $cantidadLibros,
                    'fecha' => date('c'),
                ]);
        } catch (Throwable $error) {
            return $this->response
                ->setStatusCode(500)
                ->setJSON([
                    'estado' => 'error',
                    'proyecto' => 'Biblioteca Virtual',
                    'servicio' => 'Libros',
                    'base_de_datos' =>
                        'No fue posible conectar con PostgreSQL',
                    'detalle' =>
                        ENVIRONMENT === 'development'
                            ? $error->getMessage()
                            : 'Error interno del servidor.',
                ]);
        }
    }
}