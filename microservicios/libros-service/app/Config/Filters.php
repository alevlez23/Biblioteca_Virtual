<?php
/*
 * Registro de filtros del microservicio de libros.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace Config;

use App\Filters\JwtAuth;
use CodeIgniter\Config\Filters as BaseFilters;
use CodeIgniter\Filters\Cors;
use CodeIgniter\Filters\CSRF;
use CodeIgniter\Filters\DebugToolbar;
use CodeIgniter\Filters\ForceHTTPS;
use CodeIgniter\Filters\Honeypot;
use CodeIgniter\Filters\InvalidChars;
use CodeIgniter\Filters\PageCache;
use CodeIgniter\Filters\PerformanceMetrics;
use CodeIgniter\Filters\SecureHeaders;

class Filters extends BaseFilters
{
    // Los alias permiten escribir nombres cortos como cors o jwtAuth en Routes.php.
    public array $aliases = [
        'csrf' => CSRF::class,
        'toolbar' => DebugToolbar::class,
        'honeypot' => Honeypot::class,
        'invalidchars' => InvalidChars::class,
        'secureheaders' => SecureHeaders::class,
        'cors' => Cors::class,
        'forcehttps' => ForceHTTPS::class,
        'pagecache' => PageCache::class,
        'performance' => PerformanceMetrics::class,
        'jwtAuth' => JwtAuth::class,
    ];

    // Filtros internos que CodeIgniter necesita durante el ciclo de la petición.
    public array $required = [
        'before' => [
            'forcehttps',
            'pagecache',
        ],

        'after' => [
            'pagecache',
            'performance',
            'toolbar',
        ],
    ];

    // No se agregan filtros globales porque cada grupo de rutas declara los suyos.
    public array $globals = [
        'before' => [],
        'after' => [],
    ];

    // Este proyecto no asigna filtros únicamente por método HTTP.
    public array $methods = [];

    // Las reglas específicas se colocan directamente en Config/Routes.php.
    public array $filters = [];
}