<?php
/*
 * Modelo que representa la tabla administradores.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Models;

use CodeIgniter\Model;

class AdministradorModel extends Model
{
    // Tabla y clave principal utilizadas por las consultas del modelo.
    protected $table = 'administradores';

    protected $primaryKey = 'id';

    protected $useAutoIncrement = true;

    // Cada fila se devuelve como arreglo para construir respuestas JSON.
    protected $returnType = 'array';

    protected $useSoftDeletes = false;

    // La protección impide actualizar columnas no incluidas en allowedFields.
    protected $protectFields = true;

    // Únicas columnas que pueden insertarse o actualizarse de forma masiva.
    protected $allowedFields = [
        'nombre',
        'usuario',
        'password_hash',
        'rol',
        'activo',
        'ultimo_acceso',
    ];

    // CodeIgniter mantiene automáticamente registro y actualización.
    protected $useTimestamps = true;

    protected $dateFormat = 'datetime';

    protected $createdField = 'fecha_registro';

    protected $updatedField = 'fecha_actualizacion';

    protected $deletedField = '';
}