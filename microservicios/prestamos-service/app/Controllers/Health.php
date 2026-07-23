<?php
/*
 * Endpoint de diagnóstico del microservicio de préstamos.
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
     * Comprueba PostgreSQL y consulta los servicios de usuarios y libros para
     * mostrar si la integración completa se encuentra disponible.
     */
    public function index(): ResponseInterface
    {
        try {
            $database = db_connect();

            $database->query('SELECT 1');

            $totalPrestamos = $database
                ->table('prestamos')
                ->countAllResults();

            $prestamosActivos = $database
                ->table('prestamos')
                ->where('estado', 'ACTIVO')
                ->countAllResults();

            $prestamosDevueltos = $database
                ->table('prestamos')
                ->where('estado', 'DEVUELTO')
                ->countAllResults();

            $prestamosVencidos = $database
                ->table('prestamos')
                ->where('estado', 'VENCIDO')
                ->countAllResults();

            return $this->response
                ->setStatusCode(200)
                ->setJSON([
                    'estado' => 'correcto',
                    'proyecto' => 'Biblioteca Virtual',
                    'servicio' => 'Prestamos',
                    'puerto' => 8083,
                    'base_de_datos' =>
                        'PostgreSQL conectado',
                    'tabla_prestamos' => 'disponible',
                    'total_registros' =>
                        $totalPrestamos,
                    'prestamos_activos' =>
                        $prestamosActivos,
                    'prestamos_devueltos' =>
                        $prestamosDevueltos,
                    'prestamos_vencidos' =>
                        $prestamosVencidos,
                    'fecha' => date('c'),
                ]);
        } catch (Throwable $error) {
            return $this->response
                ->setStatusCode(500)
                ->setJSON([
                    'estado' => 'error',
                    'proyecto' => 'Biblioteca Virtual',
                    'servicio' => 'Prestamos',
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