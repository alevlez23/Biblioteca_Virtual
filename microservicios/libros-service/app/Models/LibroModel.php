<?php
/*
 * Modelo de acceso a la tabla libros.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Models;

use CodeIgniter\Model;

class LibroModel extends Model
{
    // Configuración principal de la tabla y su clave.
    protected $table = 'libros';

    protected $primaryKey = 'id';

    protected $useAutoIncrement = true;

    protected $returnType = 'array';

    protected $useSoftDeletes = false;

    // Protege columnas internas frente a datos no autorizados.
    protected $protectFields = true;

    // Datos bibliográficos, inventario, estado y fechas permitidos.
    protected $allowedFields = [
        'titulo',
        'autor',
        'isbn',
        'categoria',
        'editorial',
        'anio_publicacion',
        'cantidad_total',
        'ejemplares_disponibles',
        'activo',
        'fecha_registro',
        'fecha_actualizacion',
    ];

    protected $useTimestamps = false;
}