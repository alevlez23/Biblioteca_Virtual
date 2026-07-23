<?php
/*
 * Modelo de acceso a la tabla usuarios.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Models;

use CodeIgniter\Model;

class UsuarioModel extends Model
{
    // Nombre de tabla, clave primaria y formato de retorno.
    protected $table = 'usuarios';

    protected $primaryKey = 'id';

    protected $useAutoIncrement = true;

    protected $returnType = 'array';

    protected $useSoftDeletes = false;

    // Solo se aceptan columnas declaradas en allowedFields.
    protected $protectFields = true;

    // Campos que el controlador puede insertar o actualizar.
    protected $allowedFields = [
        'nombre',
        'correo',
        'telefono',
        'activo',
        'fecha_registro',
        'fecha_actualizacion',
    ];

    // Las fechas se controlan en el controlador para conservar el formato usado.
    protected $useTimestamps = false;
}