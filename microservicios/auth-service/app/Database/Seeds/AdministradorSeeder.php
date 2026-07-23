<?php
/*
 * Seeder que registra la cuenta administrativa inicial.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use RuntimeException;

class AdministradorSeeder extends Seeder
{
    /**
     * Crea la cuenta inicial usando variables de entorno.
     * La contraseña se transforma con password_hash y nunca se guarda en texto
     * plano dentro de PostgreSQL.
     */
    public function run()
    {
        // Nombre visible y usuario de acceso configurables desde .env.
        $nombre = trim(
            (string) env(
                'ADMIN_INITIAL_NAME',
                'Alejandra'
            )
        );

        $usuario = trim(
            (string) env(
                'ADMIN_INITIAL_USER',
                'alejandra'
            )
        );

        $contrasena = (string) env(
            'ADMIN_INITIAL_PASSWORD'
        );

        // Sin contraseña inicial el seeder se detiene para no crear una cuenta insegura.
        if ($contrasena === '') {
            throw new RuntimeException(
                'Falta ADMIN_INITIAL_PASSWORD en el archivo .env.'
            );
        }

        $tabla = $this->db->table('administradores');

        // Evita duplicar la cuenta si el comando se ejecuta más de una vez.
        $administradorExistente = $tabla
            ->where('usuario', $usuario)
            ->countAllResults();

        if ($administradorExistente > 0) {
            echo "El administrador {$usuario} ya existe."
                . PHP_EOL;

            return;
        }

        $fechaActual = date('Y-m-d H:i:s');

        // PASSWORD_DEFAULT permite que PHP elija un algoritmo seguro y actualizable.
        $registrado = $tabla->insert([
            'nombre' => $nombre,

            'usuario' => $usuario,

            'password_hash' => password_hash(
                $contrasena,
                PASSWORD_DEFAULT
            ),

            'rol' => 'ADMINISTRADOR',

            'activo' => true,

            'ultimo_acceso' => null,

            'fecha_registro' => $fechaActual,

            'fecha_actualizacion' => $fechaActual,
        ]);

        if (! $registrado) {
            throw new RuntimeException(
                'No fue posible registrar al administrador.'
            );
        }

        echo "Administrador {$usuario} registrado correctamente."
            . PHP_EOL;
    }
}