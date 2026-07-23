/**
 * Cliente HTTP del microservicio de libros (puerto 8082).
 * Centraliza las rutas del catálogo, el formato JSON y el encabezado Bearer.
 */

// La dirección puede cambiarse desde variables de Vite. El valor local es el
// respaldo usado durante la práctica y se limpia la barra final para evitar
// rutas con doble //.
const LIBROS_API_URL = (
  import.meta.env.VITE_LIBROS_API_URL ||
  "http://localhost:8082"
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
          "El microservicio de libros devolvió una respuesta no válida.",
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
  incluirJson = false
) {
  const encabezados = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (incluirJson) {
    encabezados["Content-Type"] =
      "application/json";
  }

  return encabezados;
}

/** Consulta el catálogo completo. */
export async function listarLibros(token) {
  const respuesta = await fetch(
    `${LIBROS_API_URL}/api/libros`,
    {
      method: "GET",
      headers: crearEncabezados(token),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Recupera un libro por su identificador. */
export async function obtenerLibro(token, id) {
  const respuesta = await fetch(
    `${LIBROS_API_URL}/api/libros/${encodeURIComponent(
      id
    )}`,
    {
      method: "GET",
      headers: crearEncabezados(token),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Envía los datos bibliográficos para crear un libro. */
export async function registrarLibro(
  token,
  datos
) {
  const respuesta = await fetch(
    `${LIBROS_API_URL}/api/libros`,
    {
      method: "POST",
      headers: crearEncabezados(token, true),
      body: JSON.stringify({
        titulo: datos.titulo,
        autor: datos.autor,
        isbn: datos.isbn,
        categoria: datos.categoria,
        editorial: datos.editorial,
        anio_publicacion:
          datos.anio_publicacion,
        cantidad_total: datos.cantidad_total,
      }),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Modifica datos y cantidad total de un libro existente. */
export async function actualizarLibro(
  token,
  id,
  datos
) {
  const respuesta = await fetch(
    `${LIBROS_API_URL}/api/libros/${encodeURIComponent(
      id
    )}`,
    {
      method: "PUT",
      headers: crearEncabezados(token, true),
      body: JSON.stringify({
        titulo: datos.titulo,
        autor: datos.autor,
        isbn: datos.isbn,
        categoria: datos.categoria,
        editorial: datos.editorial,
        anio_publicacion:
          datos.anio_publicacion,
        cantidad_total: datos.cantidad_total,
      }),
    }
  );

  return procesarRespuesta(respuesta);
}

/** Cambia el estado activo/inactivo sin eliminar el historial. */
export async function cambiarEstadoLibro(
  token,
  id,
  activo
) {
  const respuesta = await fetch(
    `${LIBROS_API_URL}/api/libros/${encodeURIComponent(
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

/** Suma o resta existencias disponibles durante préstamos y devoluciones. */
export async function ajustarDisponibilidadLibro(
  token,
  id,
  cambio
) {
  const respuesta = await fetch(
    `${LIBROS_API_URL}/api/libros/${encodeURIComponent(
      id
    )}/disponibilidad`,
    {
      method: "PATCH",
      headers: crearEncabezados(token, true),
      body: JSON.stringify({
        cambio,
      }),
    }
  );

  return procesarRespuesta(respuesta);
}