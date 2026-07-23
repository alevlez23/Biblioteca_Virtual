# Biblioteca Virtual con arquitectura de microservicios

## Descripción del proyecto

Este proyecto corresponde a la Actividad #6 de la Unidad 3. Desarrollé una aplicación web para administrar una biblioteca virtual mediante servicios independientes que se comunican con APIs REST.

La solución incluye un frontend en React y cuatro servicios de backend en CodeIgniter 4:

| Componente | Puerto | Responsabilidad |
|---|---:|---|
| `auth-service` | 8080 | Valida credenciales, genera el JWT y consulta el perfil del administrador. |
| `usuarios-service` | 8081 | Registra, consulta, edita y cambia el estado de los usuarios. |
| `libros-service` | 8082 | Administra el catálogo, las existencias y la disponibilidad. |
| `prestamos-service` | 8083 | Registra préstamos y devoluciones, y coordina usuarios y libros. |
| `frontend` | 5173 | Presenta formularios, tablas, filtros, mensajes y gráficos. |

## Tecnologías utilizadas

- React 19 y Vite para el frontend.
- Fetch API para la comunicación HTTP.
- CodeIgniter 4 y PHP 8.2 o superior para el backend.
- PostgreSQL para la persistencia de datos.
- JWT para proteger las operaciones administrativas.
- Chart.js para los gráficos del historial.
- Composer y npm para administrar dependencias.

## Estructura principal

```text
Biblioteca-Virtual/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── microservicios/
│   ├── auth-service/
│   ├── usuarios-service/
│   ├── libros-service/
│   └── prestamos-service/
├── ARCHIVOS_COMENTADOS.md
└── GUIA_DE_EXPOSICION.md
```

## Flujo general

1. La administradora escribe su usuario y contraseña en React.
2. El frontend envía las credenciales a `auth-service`.
3. El servicio valida la contraseña y devuelve un token JWT.
4. React agrega el token en la cabecera `Authorization` de las solicitudes protegidas.
5. Cada filtro `JwtAuth` verifica la firma y la fecha de expiración del token.
6. El servicio solicitado consulta PostgreSQL y devuelve JSON.
7. React actualiza la pantalla con el resultado.

## Comunicación necesaria para registrar un préstamo

Antes de registrar un préstamo, `prestamos-service` realiza estas verificaciones:

1. Consulta `usuarios-service` para comprobar que el usuario exista y esté activo.
2. Consulta `libros-service` para comprobar que el libro exista, esté activo y tenga disponibilidad.
3. Verifica que no exista un préstamo pendiente del mismo libro para ese usuario.
4. Guarda el movimiento en PostgreSQL.
5. Solicita a `libros-service` que reste una unidad disponible.
6. Si el ajuste del libro falla, elimina el préstamo recién creado para no dejar datos incoherentes.

Al registrar una devolución ocurre el proceso inverso: el préstamo cambia a `DEVUELTO` y el libro recupera una unidad disponible.

## Variables de entorno

Los archivos `.env` reales no se incluyen porque contienen información privada. Cada carpeta contiene un `.env.example` sin contraseñas reales.

La misma clave `AUTH_JWT_SECRET` debe configurarse en los cuatro servicios, ya que autenticación firma el token y los otros servicios deben validarlo.

## Instalación del frontend

```cmd
cd /d "C:\Users\evele\Desktop\Biblioteca-Virtual\frontend"
npm install
npm run dev -- --port 5173 --strictPort
```

Para comprobar la compilación:

```cmd
npm run build
```

## Instalación de cada backend

Ejecutar dentro de cada servicio:

```cmd
composer install
```

Después, copiar `.env.example` como `.env`, completar la conexión con PostgreSQL y ejecutar las migraciones correspondientes.

### Autenticación

```cmd
cd /d "C:\Users\evele\Desktop\Biblioteca-Virtual\microservicios\auth-service"
php spark migrate
php spark db:seed AdministradorSeeder
php spark serve --port 8080
```

### Usuarios

```cmd
cd /d "C:\Users\evele\Desktop\Biblioteca-Virtual\microservicios\usuarios-service"
php spark serve --port 8081
```

### Libros

```cmd
cd /d "C:\Users\evele\Desktop\Biblioteca-Virtual\microservicios\libros-service"
php spark migrate
php spark serve --port 8082
```

### Préstamos

```cmd
cd /d "C:\Users\evele\Desktop\Biblioteca-Virtual\microservicios\prestamos-service"
php spark migrate
php spark serve --port 8083
```

> Las tablas que ya existan no deben migrarse nuevamente sin revisar primero el historial de migraciones y las copias de seguridad.

## Rutas principales de las APIs

### Autenticación

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/auth/login` | Valida las credenciales y genera un JWT. |
| GET | `/api/auth/perfil` | Devuelve el perfil relacionado con el JWT. |
| POST | `/api/auth/logout` | Confirma el cierre de sesión del cliente. |

### Usuarios

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/usuarios` | Consulta los usuarios. |
| GET | `/api/usuarios/{id}` | Consulta un usuario. |
| POST | `/api/usuarios` | Registra un usuario. |
| PUT | `/api/usuarios/{id}` | Actualiza un usuario. |
| PATCH | `/api/usuarios/{id}/estado` | Activa o desactiva un usuario. |

### Libros

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/libros` | Consulta el catálogo. |
| GET | `/api/libros/{id}` | Consulta un libro. |
| POST | `/api/libros` | Registra un libro. |
| PUT | `/api/libros/{id}` | Actualiza un libro. |
| PATCH | `/api/libros/{id}/estado` | Activa o desactiva un libro. |
| PATCH | `/api/libros/{id}/disponibilidad` | Suma o resta unidades disponibles. |

### Préstamos

| Método | Ruta | Función |
|---|---|---|
| GET | `/api/prestamos` | Consulta el historial. |
| GET | `/api/prestamos/{id}` | Consulta un movimiento. |
| POST | `/api/prestamos` | Registra un préstamo. |
| PATCH | `/api/prestamos/{id}/devolucion` | Registra la devolución. |

## Archivos JSON

Los archivos `package.json`, `package-lock.json`, `composer.json` y `composer.lock` no contienen comentarios porque el formato JSON no admite comentarios. Su función se explica en este README y en la guía de exposición.

## Seguridad antes de publicar en Git

No se deben subir:

- Archivos `.env`.
- Contraseñas de PostgreSQL.
- Claves JWT.
- Tokens copiados desde el navegador.
- Carpetas `node_modules`, `vendor`, `dist` y `writable`.
- Datos personales innecesarios.

## Autora

**Alejandra Vélez — desarrollo integral del frontend, backend, bases de datos, integración, pruebas y documentación.**
