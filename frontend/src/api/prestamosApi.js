/**
 * Cliente HTTP del microservicio de préstamos (puerto 8083).
 * Contiene las operaciones que usa React para consultar movimientos, registrar
 * un préstamo y procesar una devolución.
 */

// La dirección puede cambiarse desde variables de Vite. El valor local es el
// respaldo usado durante la práctica y se limpia la barra final para evitar
// rutas con doble //.
const PRESTAMOS_API_URL = (
  import.meta.env.VITE_PRESTAMOS_API_URL ||
  "http://localhost:8083"
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
          "El microservicio de préstamos devolvió una respuesta no válida.",
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
function crearEncabezados(
  token,
  incluirContenidoJson = false
) {
  const encabezados = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (incluirContenidoJson) {
    encabezados["Content-Type"] =
      "application/json";
  }

  return encabezados;
}

/** Consulta todos los movimientos de préstamo. */
export async function listarPrestamos(token) {
  const respuesta = await fetch(
    `${PRESTAMOS_API_URL}/api/prestamos`,
    {
      method: "GET",
      headers: crearEncabezados(token),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Recupera un préstamo específico. */
export async function obtenerPrestamo(
  token,
  id
) {
  const respuesta = await fetch(
    `${PRESTAMOS_API_URL}/api/prestamos/${encodeURIComponent(
      id
    )}`,
    {
      method: "GET",
      headers: crearEncabezados(token),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Envía usuario, libro, fecha límite y observaciones para crear el préstamo. */
export async function registrarPrestamo(
  token,
  datos
) {
  const respuesta = await fetch(
    `${PRESTAMOS_API_URL}/api/prestamos`,
    {
      method: "POST",
      headers: crearEncabezados(token, true),
      body: JSON.stringify({
        usuario_id: Number(datos.usuario_id),
        libro_id: Number(datos.libro_id),
        fecha_limite: datos.fecha_limite,
        observaciones:
          datos.observaciones || "",
      }),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Marca un préstamo como devuelto y permite recuperar la existencia del libro. */
export async function registrarDevolucion(
  token,
  id
) {
  const respuesta = await fetch(
    `${PRESTAMOS_API_URL}/api/prestamos/${encodeURIComponent(
      id
    )}/devolucion`,
    {
      method: "PATCH",
      headers: crearEncabezados(token, true),
      body: JSON.stringify({}),
    }
  );

  return procesarRespuesta(respuesta);
}