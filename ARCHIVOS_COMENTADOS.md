# Archivos revisados y comentados

Los comentarios se redactaron en español, con un tono sencillo y técnico. Se explican funciones, decisiones, validaciones y flujos importantes. No se añadieron comentarios innecesarios a instrucciones evidentes.

## Frontend

- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/api/authApi.js`
- `frontend/src/api/usuariosApi.js`
- `frontend/src/api/librosApi.js`
- `frontend/src/api/prestamosApi.js`
- `frontend/src/components/ModuloUsuarios.jsx`
- `frontend/src/components/ModuloLibros.jsx`
- `frontend/src/components/ModuloPrestamos.jsx`
- `frontend/src/components/ModuloHistorial.jsx`
- Hojas de estilo principales y de cada módulo.
- `frontend/vite.config.js`
- `frontend/eslint.config.js`
- `frontend/index.html`

## Backend

En los cuatro servicios se documentaron las rutas, la configuración CORS y los filtros principales.

### Autenticación

- `app/Controllers/Auth.php`
- `app/Controllers/Health.php`
- `app/Models/AdministradorModel.php`
- Migración de administradores.
- Seeder de la cuenta inicial.

### Usuarios

- `app/Controllers/Usuarios.php`
- `app/Controllers/Health.php`
- `app/Models/UsuarioModel.php`
- `app/Filters/JwtAuth.php`

### Libros

- `app/Controllers/Libros.php`
- `app/Controllers/Health.php`
- `app/Models/LibroModel.php`
- `app/Filters/JwtAuth.php`
- Migración de libros.

### Préstamos

- `app/Controllers/Prestamos.php`
- `app/Controllers/Health.php`
- `app/Models/PrestamoModel.php`
- `app/Filters/JwtAuth.php`
- Migración de préstamos.

## Archivos que no se comentan línea por línea

- `package.json`, `package-lock.json`, `composer.json` y `composer.lock`, porque JSON no admite comentarios.
- Archivos internos generados por CodeIgniter que no fueron modificados para la práctica.
- Dependencias externas de `node_modules` y `vendor`.
- Recursos binarios, fotografías e imágenes.

La función de estos elementos se explica en `README.md` y `GUIA_DE_EXPOSICION.md`.
