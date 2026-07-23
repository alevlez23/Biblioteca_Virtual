<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Psr\Log\LoggerInterface;

/**
 * BaseController ofrece un lugar conveniente para cargar componentes.
 * y realizando funciones que todos tus controladores necesitan.
 *
 * Extiende esta clase en cualquier controlador nuevo.:
 * ```
 *     La clase Home extiende BaseController
 * ```
 *
 * Por seguridad, me asegure de declarar cualquier método nuevo como `protected` o `private`.
 */
abstract class BaseController extends Controller
{
    /**
     * Me asegure de declarar las propiedades correspondientes a cualquier operación de obtención de propiedades que hayas inicializado.
     * La creación de propiedades dinámicas está obsoleta en PHP 8.2.
     * sesión protegida;
     */

    // protected $session;

    /**
     * @return void
     */
    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger)
    {
        // Se carga aquí todos los helpers que quieras tener disponibles en tus controladores que extienden de BaseController.
        // Precaución: No se debe colocar esto debajo de la llamada a parent::initController().
        // $this->helpers = ['form', 'url'];

        // Caution: Do not edit this line.
        parent::initController($request, $response, $logger);

        // Preload any models, libraries, etc, here.
        // $this->session = service('session');
    }
}
