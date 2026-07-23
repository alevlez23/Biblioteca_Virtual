/**
 * Cliente HTTP del microservicio de usuarios (puerto 8081).
 * Todas las operaciones protegidas envían el token JWT recibido al iniciar
 * sesión y devuelven objetos JavaScript listos para usar en React.
 */

// La dirección puede cambiarse desde variables de Vite. El valor local es el
// respaldo usado durante la práctica y se limpia la barra final para evitar
// rutas con doble //.
const USUARIOS_API_URL = (
  import.meta.env.VITE_USUARIOS_API_URL ||
  "http://localhost:8081"
).replace(/\/+$/, "");

/**
 * Convierte la respuesta HTTP en JSON y genera un Error cuando el servidor
 * devuelve un código fuera del rango 200-299. Leer primero como texto permite
 * mostrar un mensaje entendible incluso si la API responde contenido inválido.
 */
async function procesarRespuesta(respuesta) {
  const contenido = await respuesta.text();

  let datos = {};

  if (contenido) {
    try {
      datos = JSON.parse(contenido);
    } catch {
      datos = {
        mensaje:
          "El microservicio de usuarios devolvió una respuesta no válida.",
      };
    }
  }

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ||
        datos.detalle ||
        "No fue posible completar la operación."
    );
  }

  return datos;
}

/**
 * Construye los encabezados comunes. Content-Type solo se agrega cuando la
 * solicitud lleva un cuerpo JSON; Authorization protege la ruta con JWT.
 */
function crearEncabezados(token, incluirJson = false) {
  const encabezados = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (incluirJson) {
    encabezados["Content-Type"] = "application/json";
  }

  return encabezados;
}

/** Consulta todos los lectores registrados. */
export async function listarUsuarios(token) {
  const respuesta = await fetch(
    `${USUARIOS_API_URL}/api/usuarios`,
    {
      method: "GET",
      headers: crearEncabezados(token),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Consulta un lector específico por su identificador. */
export async function obtenerUsuario(token, id) {
  const respuesta = await fetch(
    `${USUARIOS_API_URL}/api/usuarios/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: crearEncabezados(token),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Registra un nuevo lector con los datos del formulario. */
export async function registrarUsuario(token, datos) {
  const respuesta = await fetch(
    `${USUARIOS_API_URL}/api/usuarios`,
    {
      method: "POST",
      headers: crearEncabezados(token, true),
      body: JSON.stringify({
        nombre: datos.nombre,
        correo: datos.correo,
        telefono: datos.telefono,
      }),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Actualiza un lector existente sin crear un registro duplicado. */
export async function actualizarUsuario(
  token,
  id,
  datos
) {
  const respuesta = await fetch(
    `${USUARIOS_API_URL}/api/usuarios/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: crearEncabezados(token, true),
      body: JSON.stringify({
        nombre: datos.nombre,
        correo: datos.correo,
        telefono: datos.telefono,
      }),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Activa o desactiva un lector mediante una solicitud PATCH. */
export async function cambiarEstadoUsuario(
  token,
  id,
  activo
) {
  const respuesta = await fetch(
    `${USUARIOS_API_URL}/api/usuarios/${encodeURIComponent(
      id
    )}/estado`,
    {
      method: "PATCH",
      headers: crearEncabezados(token, true),
      body: JSON.stringify({
        activo,
      }),
    }
  );

  return procesarRespuesta(respuesta);
}