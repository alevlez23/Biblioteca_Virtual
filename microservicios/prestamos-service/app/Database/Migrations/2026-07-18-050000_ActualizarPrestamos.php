<?php
/*
 * Migración que crea o actualiza la tabla prestamos.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class ActualizarPrestamos extends Migration
{
    /**
     * Prepara la tabla necesaria para registrar movimientos. También completa
     * columnas faltantes cuando existe una versión anterior de la estructura.
     */
    public function up()
    {
        /*
         * Conserva la tabla y los registros existentes.
         * Solamente agrega las columnas faltantes.
         */
        $this->db->query(
            "
            ALTER TABLE prestamos
            ADD COLUMN IF NOT EXISTS fecha_limite DATE NULL
            "
        );

        $this->db->query(
            "
            ALTER TABLE prestamos
            ADD COLUMN IF NOT EXISTS fecha_devolucion TIMESTAMP NULL
            "
        );

        $this->db->query(
            "
            ALTER TABLE prestamos
            ADD COLUMN IF NOT EXISTS observaciones VARCHAR(255) NULL
            "
        );

        $this->db->query(
            "
            ALTER TABLE prestamos
            ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP NULL
            "
        );

        /*
         * Normaliza los registros anteriores.
         */
        $this->db->query(
            "
            UPDATE prestamos
            SET fecha_prestamo = CURRENT_TIMESTAMP
            WHERE fecha_prestamo IS NULL
            "
        );

        $this->db->query(
            "
            UPDATE prestamos
            SET fecha_limite =
                (
                    COALESCE(
                        fecha_prestamo,
                        CURRENT_TIMESTAMP
                    )::date + 14
                )
            WHERE fecha_limite IS NULL
            "
        );

        $this->db->query(
            "
            UPDATE prestamos
            SET fecha_actualizacion =
                COALESCE(
                    fecha_prestamo,
                    CURRENT_TIMESTAMP
                )
            WHERE fecha_actualizacion IS NULL
            "
        );

        $this->db->query(
            "
            UPDATE prestamos
            SET estado = UPPER(TRIM(estado))
            WHERE estado IS NOT NULL
            "
        );

        $this->db->query(
            "
            UPDATE prestamos
            SET estado = 'ACTIVO'
            WHERE estado IS NULL
               OR estado NOT IN (
                    'ACTIVO',
                    'DEVUELTO',
                    'VENCIDO'
               )
            "
        );

        /*
         * Configuración predeterminada para nuevos préstamos.
         */
        $this->db->query(
            "
            ALTER TABLE prestamos
            ALTER COLUMN fecha_prestamo
            SET DEFAULT CURRENT_TIMESTAMP
            "
        );

        $this->db->query(
            "
            ALTER TABLE prestamos
            ALTER COLUMN fecha_prestamo
            SET NOT NULL
            "
        );

        $this->db->query(
            "
            ALTER TABLE prestamos
            ALTER COLUMN fecha_limite
            SET DEFAULT (CURRENT_DATE + 14)
            "
        );

        $this->db->query(
            "
            ALTER TABLE prestamos
            ALTER COLUMN fecha_limite
            SET NOT NULL
            "
        );

        $this->db->query(
            "
            ALTER TABLE prestamos
            ALTER COLUMN estado
            SET DEFAULT 'ACTIVO'
            "
        );

        $this->db->query(
            "
            ALTER TABLE prestamos
            ALTER COLUMN estado
            SET NOT NULL
            "
        );

        $this->db->query(
            "
            ALTER TABLE prestamos
            ALTER COLUMN fecha_actualizacion
            SET DEFAULT CURRENT_TIMESTAMP
            "
        );

        $this->db->query(
            "
            ALTER TABLE prestamos
            ALTER COLUMN fecha_actualizacion
            SET NOT NULL
            "
        );

        /*
         * Índices para mejorar las consultas.
         */
        $this->db->query(
            "
            CREATE INDEX IF NOT EXISTS
            idx_prestamos_usuario
            ON prestamos (usuario_id)
            "
        );

        $this->db->query(
            "
            CREATE INDEX IF NOT EXISTS
            idx_prestamos_libro
            ON prestamos (libro_id)
            "
        );

        $this->db->query(
            "
            CREATE INDEX IF NOT EXISTS
            idx_prestamos_estado
            ON prestamos (estado)
            "
        );

        $this->db->query(
            "
            CREATE INDEX IF NOT EXISTS
            idx_prestamos_fecha_limite
            ON prestamos (fecha_limite)
            "
        );
    }

    /** Revierte los cambios realizados por esta migración. */
    public function down()
    {
        /*
         * No se eliminan columnas ni datos para evitar
         * afectar la tabla que existía antes de esta migración.
         */
    }
}