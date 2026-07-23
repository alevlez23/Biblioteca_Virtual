<?php
/*
 * Migración que crea o completa la tabla libros.
 *
 * Este archivo pertenece al backend de la Biblioteca Virtual. Los comentarios
 * explican las decisiones importantes sin describir instrucciones obvias del
 * lenguaje o del framework.
 */

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateLibros extends Migration
{
    /**
     * Crea la tabla cuando no existe y agrega de forma segura columnas faltantes
     * cuando se ejecuta sobre una versión anterior del proyecto.
     */
    public function up()
    {
        /*
         * Crea la tabla completa cuando todavía
         * no existe en PostgreSQL.
         */
        $this->db->query(
            "
            CREATE TABLE IF NOT EXISTS libros (
                id SERIAL PRIMARY KEY,
                titulo VARCHAR(180) NOT NULL,
                autor VARCHAR(150) NOT NULL,
                isbn VARCHAR(30) NOT NULL,
                categoria VARCHAR(100)
                    NOT NULL
                    DEFAULT 'General',
                editorial VARCHAR(120),
                anio_publicacion SMALLINT,
                cantidad_total INTEGER
                    NOT NULL
                    DEFAULT 1,
                ejemplares_disponibles INTEGER
                    NOT NULL
                    DEFAULT 1,
                activo BOOLEAN
                    NOT NULL
                    DEFAULT TRUE,
                fecha_registro TIMESTAMP
                    NOT NULL
                    DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP NULL
            )
            "
        );

        /*
         * Estas instrucciones conservan una tabla
         * anterior y agregan las columnas faltantes.
         */
        $this->db->query(
            "
            ALTER TABLE libros
            ADD COLUMN IF NOT EXISTS categoria
            VARCHAR(100) NOT NULL DEFAULT 'General'
            "
        );

        $this->db->query(
            "
            ALTER TABLE libros
            ADD COLUMN IF NOT EXISTS editorial
            VARCHAR(120)
            "
        );

        $this->db->query(
            "
            ALTER TABLE libros
            ADD COLUMN IF NOT EXISTS anio_publicacion
            SMALLINT
            "
        );

        $this->db->query(
            "
            ALTER TABLE libros
            ADD COLUMN IF NOT EXISTS cantidad_total
            INTEGER NOT NULL DEFAULT 1
            "
        );

        $this->db->query(
            "
            ALTER TABLE libros
            ADD COLUMN IF NOT EXISTS ejemplares_disponibles
            INTEGER NOT NULL DEFAULT 1
            "
        );

        $this->db->query(
            "
            ALTER TABLE libros
            ADD COLUMN IF NOT EXISTS activo
            BOOLEAN NOT NULL DEFAULT TRUE
            "
        );

        $this->db->query(
            "
            ALTER TABLE libros
            ADD COLUMN IF NOT EXISTS fecha_registro
            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            "
        );

        $this->db->query(
            "
            ALTER TABLE libros
            ADD COLUMN IF NOT EXISTS fecha_actualizacion
            TIMESTAMP NULL
            "
        );

        /*
         * Corrige cantidades anteriores que estén
         * vacías o tengan valores negativos.
         */
        $this->db->query(
            "
            UPDATE libros
            SET cantidad_total = 1
            WHERE cantidad_total IS NULL
               OR cantidad_total < 0
            "
        );

        $this->db->query(
            "
            UPDATE libros
            SET ejemplares_disponibles = cantidad_total
            WHERE ejemplares_disponibles IS NULL
               OR ejemplares_disponibles < 0
               OR ejemplares_disponibles > cantidad_total
            "
        );

        $this->db->query(
            "
            UPDATE libros
            SET fecha_actualizacion = fecha_registro
            WHERE fecha_actualizacion IS NULL
            "
        );

        /*
         * Índices para acelerar las búsquedas.
         */
        $this->db->query(
            "
            CREATE INDEX IF NOT EXISTS
            idx_libros_isbn_lower
            ON libros (LOWER(isbn))
            "
        );

        $this->db->query(
            "
            CREATE INDEX IF NOT EXISTS
            idx_libros_titulo_lower
            ON libros (LOWER(titulo))
            "
        );

        $this->db->query(
            "
            CREATE INDEX IF NOT EXISTS
            idx_libros_autor_lower
            ON libros (LOWER(autor))
            "
        );
    }

    /** Elimina la tabla para revertir completamente esta migración. */
    public function down()
    {
        $this->db->query(
            'DROP TABLE IF EXISTS libros CASCADE'
        );
    }
}