<?php
/*
 * Modelo de acceso a la tabla prestamos.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Models;

use CodeIgniter\Model;

class PrestamoModel extends Model
{
    // Tabla, clave principal y retorno como arreglo.
    protected $table = 'prestamos';

    protected $primaryKey = 'id';

    protected $useAutoIncrement = true;

    protected $returnType = 'array';

    protected $useSoftDeletes = false;

    // Evita guardar columnas que no pertenecen al movimiento.
    protected $protectFields = true;

    // Datos permitidos para préstamo, vencimiento y devolución.
    protected $allowedFields = [
        'usuario_id',
        'libro_id',
        'fecha_prestamo',
        'fecha_limite',
        'fecha_devolucion',
        'estado',
        'observaciones',
        'fecha_actualizacion',
    ];

    protected $useTimestamps = false;
}