<?php
/*
 * Política CORS del microservicio de préstamos.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace Config;

use CodeIgniter\Config\BaseConfig;

class Cors extends BaseConfig
{
    /**
     * Configuración utilizada por el filtro cors.
     * Solo se aceptan los dos orígenes locales usados por Vite y se autorizan
     * los encabezados necesarios para JSON y el token Bearer.
     */
    public array $default = [
        // Dominios desde los que React puede consumir esta API.
        'allowedOrigins' => [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ],

        'allowedOriginsPatterns' => [],

        'supportsCredentials' => false,

        // Authorization es obligatorio para transportar el JWT.
        'allowedHeaders' => [
            'Accept',
            'Authorization',
            'Content-Type',
            'X-Requested-With',
        ],

        'exposedHeaders' => [],

        // Métodos HTTP que realmente utiliza este microservicio.
        'allowedMethods' => [
            'GET',
            'POST',
            'PUT',
            'PATCH',
            'OPTIONS',
        ],

        // El navegador puede reutilizar el resultado del preflight durante dos horas.
        'maxAge' => 7200,
    ];
}