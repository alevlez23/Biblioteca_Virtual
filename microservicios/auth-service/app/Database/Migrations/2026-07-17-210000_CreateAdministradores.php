<?php
/*
 * Migración que crea la tabla de administradores.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAdministradores extends Migration
{
    /** Crea campos, clave primaria e índice único del usuario administrador. */
    public function up()
    {
        // Definición física de las columnas y sus restricciones.
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'auto_increment' => true,
            ],

            'nombre' => [
                'type'       => 'VARCHAR',
                'constraint' => 120,
                'null'       => false,
            ],

            'usuario' => [
                'type'       => 'VARCHAR',
                'constraint' => 80,
                'null'       => false,
            ],

            'password_hash' => [
                'type'       => 'VARCHAR',
                'constraint' => 255,
                'null'       => false,
            ],

            'rol' => [
                'type'       => 'VARCHAR',
                'constraint' => 30,
                'default'    => 'ADMINISTRADOR',
                'null'       => false,
            ],

            'activo' => [
                'type'    => 'BOOLEAN',
                'default' => true,
                'null'    => false,
            ],

            'ultimo_acceso' => [
                'type' => 'TIMESTAMP',
                'null' => true,
            ],

            'fecha_registro' => [
                'type' => 'TIMESTAMP',
                'null' => false,
            ],

            'fecha_actualizacion' => [
                'type' => 'TIMESTAMP',
                'null' => false,
            ],
        ]);

        // El id identifica de forma única cada administrador.
        $this->forge->addKey('id', true);

        // No se permiten dos cuentas con el mismo nombre de usuario.
        $this->forge->addUniqueKey(
            'usuario',
            'uq_administradores_usuario'
        );

        $this->forge->createTable(
            'administradores',
            true
        );
    }

    /** Revierte la migración eliminando la tabla creada por up(). */
    public function down()
    {
        $this->forge->dropTable(
            'administradores',
            true
        );
    }
}