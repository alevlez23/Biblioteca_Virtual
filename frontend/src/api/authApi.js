/**
 * Funciones de comunicación con el microservicio de autenticación.
 * Mantengo las llamadas HTTP fuera de los componentes para que la interfaz se
 * concentre en estados y eventos, no en construir rutas o encabezados.
 */

// La dirección puede cambiarse desde variables de Vite. El valor local es el
// respaldo usado durante la práctica y se limpia la barra final para evitar
// rutas con doble //.
const AUTH_API_URL = (
  import.meta.env.VITE_AUTH_API_URL ||
  "http://localhost:8080"
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
        mensaje: "El servidor devolvió una respuesta no válida.",
      };
    }
  }

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ||
        "No fue posible completar la solicitud."
    );
  }

  return datos;
}

/** Envía usuario y contraseña y recibe el token JWT de acceso. */
export async function iniciarSesion({
  usuario,
  contrasena,
}) {
  const respuesta = await fetch(
    `${AUTH_API_URL}/api/auth/login`,
    {
      method: "POST",

      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        usuario,
        contrasena,
      }),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Comprueba el JWT y recupera los datos actuales del administrador. */
export async function obtenerPerfil(token) {
  const respuesta = await fetch(
    `${AUTH_API_URL}/api/auth/perfil`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return procesarRespuesta(respuesta);
}

/** Informa al backend que la sesión terminó; el token también se borra localmente. */
export async function cerrarSesionRemota(token) {
  const respuesta = await fetch(
    `${AUTH_API_URL}/api/auth/logout`,
    {
      method: "POST",

      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return procesarRespuesta(respuesta);
}