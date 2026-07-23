/**
 * Módulo de administración del catálogo.
 *
 * Controla datos bibliográficos, existencias, disponibilidad, búsqueda y
 * cambios de estado. Las reglas críticas también se repiten en el backend para
 * que no dependan únicamente de la interfaz.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  actualizarLibro,
  cambiarEstadoLibro,
  listarLibros,
  registrarLibro,
} from "../api/librosApi";

// Valores iniciales del formulario de libros.
const FORMULARIO_VACIO = {
  titulo: "",
  autor: "",
  isbn: "",
  categoria: "General",
  editorial: "",
  anio_publicacion: "",
  cantidad_total: "1",
};

/** Presenta las fechas de PostgreSQL en formato local. */
function formatearFecha(fecha) {
  if (!fecha) {
    return "Sin fecha";
  }

  const fechaNormalizada = fecha.includes("T")
    ? fecha
    : fecha.replace(" ", "T");

  const objetoFecha = new Date(fechaNormalizada);

  if (Number.isNaN(objetoFecha.getTime())) {
    return fecha;
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(objetoFecha);
}

/**
 * Traduce cantidades y estado del libro a una etiqueta visual: disponible,
 * parcial, agotado o inactivo.
 */
function obtenerDisponibilidad(libro) {
  const cantidadTotal =
    Number(libro.cantidad_total) || 0;

  const ejemplaresDisponibles =
    Number(libro.ejemplares_disponibles) || 0;

  if (!libro.activo) {
    return {
      texto: "Inactivo",
      clase:
        "libro-disponibilidad libro-disponibilidad--inactivo",
    };
  }

  if (
    cantidadTotal === 0 ||
    ejemplaresDisponibles === 0
  ) {
    return {
      texto: "No disponible",
      clase:
        "libro-disponibilidad libro-disponibilidad--agotado",
    };
  }

  if (ejemplaresDisponibles < cantidadTotal) {
    return {
      texto: "Disponibilidad parcial",
      clase:
        "libro-disponibilidad libro-disponibilidad--parcial",
    };
  }

  return {
    texto: "Disponible",
    clase:
      "libro-disponibilidad libro-disponibilidad--disponible",
  };
}

/** Componente principal del catálogo conectado a libros-service. */
export default function ModuloLibros({ token }) {
  // Estados del catálogo, formulario, filtros y solicitudes activas.
  const [libros, setLibros] = useState([]);

  const [formulario, setFormulario] = useState(
    FORMULARIO_VACIO
  );

  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] =
    useState(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] =
    useState(false);

  const [
    cambiandoEstadoId,
    setCambiandoEstadoId,
  ] = useState(null);

  const [mensaje, setMensaje] = useState(null);

  const tituloInputRef = useRef(null);

  /** Consulta el catálogo y devuelve true cuando la actualización fue correcta. */
  const cargarLibros = useCallback(async () => {
    setCargando(true);

    try {
      const respuesta = await listarLibros(token);

      setLibros(
        Array.isArray(respuesta.libros)
          ? respuesta.libros
          : []
      );

      return true;
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error.message ||
          "No fue posible cargar los libros.",
      });

      return false;
    } finally {
      setCargando(false);
    }
  }, [token]);

  // Carga inicial del catálogo.
  useEffect(() => {
    cargarLibros();
  }, [cargarLibros]);

  // Busca en título, autor, ISBN, categoría, editorial, año y estado.
  const librosFiltrados = useMemo(() => {
    const termino = busqueda
      .trim()
      .toLocaleLowerCase();

    if (!termino) {
      return libros;
    }

    return libros.filter((libro) => {
      const contenido = [
        libro.titulo,
        libro.autor,
        libro.isbn,
        libro.categoria,
        libro.editorial,
        libro.anio_publicacion,
        libro.activo ? "activo" : "inactivo",
      ]
        .join(" ")
        .toLocaleLowerCase();

      return contenido.includes(termino);
    });
  }, [busqueda, libros]);

  // Totales usados en las tarjetas estadísticas.
  const totalActivos = libros.filter(
    (libro) => libro.activo
  ).length;

  const totalEjemplares = libros.reduce(
    (acumulado, libro) =>
      acumulado +
      (Number(libro.cantidad_total) || 0),
    0
  );

  const totalDisponibles = libros.reduce(
    (acumulado, libro) =>
      acumulado +
      (Number(
        libro.ejemplares_disponibles
      ) || 0),
    0
  );

  /** Lleva el cursor al título al iniciar o editar un libro. */
  const enfocarTitulo = () => {
    window.requestAnimationFrame(() => {
      tituloInputRef.current?.focus();
    });
  };

  /** Limpia todos los campos y sale del modo edición. */
  const limpiarFormulario = () => {
    setFormulario(FORMULARIO_VACIO);
    setEditandoId(null);
  };

  /** Prepara un formulario vacío para un nuevo título. */
  const iniciarNuevoLibro = () => {
    limpiarFormulario();
    setMensaje(null);
    enfocarTitulo();
  };

  /** Actualiza de forma genérica cualquier campo del formulario. */
  const cambiarCampo = (evento) => {
    const { name, value } = evento.target;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));
  };

  /** Carga una fila en el formulario y desplaza la vista hacia arriba. */
  const editarLibro = (libro) => {
    setFormulario({
      titulo: libro.titulo || "",
      autor: libro.autor || "",
      isbn: libro.isbn || "",
      categoria: libro.categoria || "General",
      editorial: libro.editorial || "",
      anio_publicacion:
        libro.anio_publicacion ?? "",
      cantidad_total: String(
        libro.cantidad_total ?? 1
      ),
    });

    setEditandoId(libro.id);
    setMensaje(null);
    enfocarTitulo();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /** Descarta los cambios locales de una edición. */
  const cancelarEdicion = () => {
    limpiarFormulario();

    setMensaje({
      tipo: "informacion",
      texto:
        "La edición del libro fue cancelada.",
    });
  };

  /**
   * Comprueba textos obligatorios, año e inventario antes de llamar a la API.
   * El backend vuelve a validar para mantener la seguridad de los datos.
   */
  const validarFormulario = () => {
    const titulo = formulario.titulo.trim();
    const autor = formulario.autor.trim();
    const isbn = formulario.isbn.trim();

    const cantidadTotal = Number(
      formulario.cantidad_total
    );

    const anioMaximo =
      new Date().getFullYear() + 1;

    if (titulo.length < 2) {
      return "El título debe contener al menos dos caracteres.";
    }

    if (autor.length < 2) {
      return "El autor debe contener al menos dos caracteres.";
    }

    if (!isbn) {
      return "Escribe el ISBN del libro.";
    }

    if (formulario.anio_publicacion !== "") {
      const anio = Number(
        formulario.anio_publicacion
      );

      if (
        !Number.isInteger(anio) ||
        anio < 1000 ||
        anio > anioMaximo
      ) {
        return "El año de publicación no es válido.";
      }
    }

    if (
      !Number.isInteger(cantidadTotal) ||
      cantidadTotal < 0
    ) {
      return "La cantidad total debe ser un número entero igual o mayor que cero.";
    }

    return null;
  };

  /** Registra o actualiza el libro y sincroniza la fila devuelta por la API. */
  const guardarLibro = async (evento) => {
    evento.preventDefault();
    setMensaje(null);

    const errorValidacion =
      validarFormulario();

    if (errorValidacion) {
      setMensaje({
        tipo: "error",
        texto: errorValidacion,
      });

      return;
    }

    const datos = {
      titulo: formulario.titulo.trim(),
      autor: formulario.autor.trim(),
      isbn: formulario.isbn.trim(),
      categoria:
        formulario.categoria.trim() ||
        "General",
      editorial:
        formulario.editorial.trim(),
      anio_publicacion:
        formulario.anio_publicacion === ""
          ? null
          : Number(
              formulario.anio_publicacion
            ),
      cantidad_total: Number(
        formulario.cantidad_total
      ),
    };

    setGuardando(true);

    try {
      let respuesta;

      if (editandoId !== null) {
        respuesta = await actualizarLibro(
          token,
          editandoId,
          datos
        );

        setLibros((librosActuales) =>
          librosActuales.map((libro) =>
            libro.id === editandoId
              ? respuesta.libro
              : libro
          )
        );
      } else {
        respuesta = await registrarLibro(
          token,
          datos
        );

        setLibros((librosActuales) => [
          respuesta.libro,
          ...librosActuales,
        ]);
      }

      setMensaje({
        tipo: "correcto",
        texto:
          respuesta.mensaje ||
          "La operación se completó correctamente.",
      });

      limpiarFormulario();
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error.message ||
          "No fue posible guardar el libro.",
      });
    } finally {
      setGuardando(false);
    }
  };

  /** Activa o desactiva un libro sin borrarlo de PostgreSQL. */
  const cambiarEstado = async (libro) => {
    const nuevoEstado = !libro.activo;

    setMensaje(null);
    setCambiandoEstadoId(libro.id);

    try {
      const respuesta =
        await cambiarEstadoLibro(
          token,
          libro.id,
          nuevoEstado
        );

      setLibros((librosActuales) =>
        librosActuales.map((elemento) =>
          elemento.id === libro.id
            ? respuesta.libro
            : elemento
        )
      );

      setMensaje({
        tipo: "correcto",
        texto:
          respuesta.mensaje ||
          "El estado del libro fue actualizado.",
      });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error.message ||
          "No fue posible cambiar el estado del libro.",
      });
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  /** Vuelve a consultar el catálogo directamente desde el backend. */
  const actualizarListado = async () => {
    setMensaje(null);

    const actualizado = await cargarLibros();

    if (actualizado) {
      setMensaje({
        tipo: "correcto",
        texto:
          "El catálogo fue actualizado desde PostgreSQL.",
      });
    }
  };

  // Interfaz del catálogo: cabecera, estadísticas, formulario y tabla.
  return (
    <div className="libros-modulo">
      <section className="welcome-card">
        <div>
          <span className="eyebrow">
            Microservicio de libros
          </span>

          <h2>Gestión del catálogo</h2>

          <p>
            Registra, consulta, edita, activa y
            desactiva los libros disponibles en la
            Biblioteca Virtual.
          </p>
        </div>

        <span className="status">
          API conectada · Puerto 8082
        </span>
      </section>

      <section className="libros-resumen">
        <article>
          <span>Títulos registrados</span>
          <strong>{libros.length}</strong>
          <small>Registros del catálogo</small>
        </article>

        <article>
          <span>Libros activos</span>
          <strong>{totalActivos}</strong>
          <small>Disponibles en el sistema</small>
        </article>

        <article>
          <span>Total de ejemplares</span>
          <strong>{totalEjemplares}</strong>
          <small>Existencias registradas</small>
        </article>

        <article>
          <span>Ejemplares disponibles</span>
          <strong>{totalDisponibles}</strong>
          <small>Listos para préstamo</small>
        </article>
      </section>

      {mensaje && (
        <div
          className={`libros-mensaje libros-mensaje--${mensaje.tipo}`}
          role="alert"
        >
          <span>
            {mensaje.tipo === "error"
              ? "!"
              : "✓"}
          </span>

          <p>{mensaje.texto}</p>

          <button
            type="button"
            onClick={() => setMensaje(null)}
            aria-label="Cerrar mensaje"
          >
            ×
          </button>
        </div>
      )}

      <section className="libros-contenido">
        <article className="libros-panel libros-formulario-panel">
          <header className="libros-panel-header">
            <div>
              <span className="eyebrow">
                {editandoId !== null
                  ? "Modo edición"
                  : "Nuevo registro"}
              </span>

              <h3>
                {editandoId !== null
                  ? "Editar libro"
                  : "Registrar libro"}
              </h3>
            </div>

            <button
              type="button"
              className="boton-secundario"
              onClick={iniciarNuevoLibro}
              disabled={guardando}
            >
              + Nuevo
            </button>
          </header>

          <form
            className="libros-formulario"
            onSubmit={guardarLibro}
          >
            <label className="libros-campo-completo">
              <span>Título</span>

              <input
                ref={tituloInputRef}
                type="text"
                name="titulo"
                value={formulario.titulo}
                onChange={cambiarCampo}
                placeholder="Ej. Cien años de soledad"
                maxLength={180}
                disabled={guardando}
              />
            </label>

            <label>
              <span>Autor</span>

              <input
                type="text"
                name="autor"
                value={formulario.autor}
                onChange={cambiarCampo}
                placeholder="Ej. Gabriel García Márquez"
                maxLength={150}
                disabled={guardando}
              />
            </label>

            <label>
              <span>ISBN</span>

              <input
                type="text"
                name="isbn"
                value={formulario.isbn}
                onChange={cambiarCampo}
                placeholder="Ej. 9780307474728"
                maxLength={30}
                disabled={guardando}
              />
            </label>

            <label>
              <span>Categoría</span>

              <input
                type="text"
                name="categoria"
                value={formulario.categoria}
                onChange={cambiarCampo}
                placeholder="Ej. Literatura"
                maxLength={100}
                disabled={guardando}
              />
            </label>

            <label>
              <span>Editorial</span>

              <input
                type="text"
                name="editorial"
                value={formulario.editorial}
                onChange={cambiarCampo}
                placeholder="Ej. Editorial Sudamericana"
                maxLength={120}
                disabled={guardando}
              />
            </label>

            <label>
              <span>Año de publicación</span>

              <input
                type="number"
                name="anio_publicacion"
                value={
                  formulario.anio_publicacion
                }
                onChange={cambiarCampo}
                placeholder="Ej. 1967"
                min="1000"
                max={
                  new Date().getFullYear() + 1
                }
                disabled={guardando}
              />
            </label>

            <label>
              <span>Cantidad total</span>

              <input
                type="number"
                name="cantidad_total"
                value={formulario.cantidad_total}
                onChange={cambiarCampo}
                min="0"
                step="1"
                disabled={guardando}
              />
            </label>

            <div className="libros-formulario-acciones libros-campo-completo">
              <button
                type="submit"
                className="boton-primario"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : editandoId !== null
                    ? "Guardar cambios"
                    : "Registrar libro"}
              </button>

              {editandoId !== null && (
                <button
                  type="button"
                  className="boton-secundario"
                  onClick={cancelarEdicion}
                  disabled={guardando}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </article>

        <article className="libros-panel libros-listado-panel">
          <header className="libros-panel-header libros-listado-header">
            <div>
              <span className="eyebrow">
                Catálogo PostgreSQL
              </span>

              <h3>Libros registrados</h3>
            </div>

            <button
              type="button"
              className="boton-secundario"
              onClick={actualizarListado}
              disabled={cargando}
            >
              {cargando
                ? "Actualizando..."
                : "Actualizar"}
            </button>
          </header>

          <div className="libros-buscador">
            <span aria-hidden="true">⌕</span>

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value
                )
              }
              placeholder="Buscar por título, autor, ISBN, categoría o editorial..."
            />

            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="libros-tabla-contenedor">
            {cargando ? (
              <div className="libros-estado-vacio">
                <div className="spinner" />
                <p>Cargando catálogo...</p>
              </div>
            ) : librosFiltrados.length === 0 ? (
              <div className="libros-estado-vacio">
                <strong>
                  No se encontraron libros
                </strong>

                <p>
                  Registra un libro o cambia el texto
                  de búsqueda.
                </p>
              </div>
            ) : (
              <table className="libros-tabla">
                <thead>
                  <tr>
                    <th>Libro</th>
                    <th>Clasificación</th>
                    <th>Existencias</th>
                    <th>Disponibilidad</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {librosFiltrados.map(
                    (libro) => {
                      const disponibilidad =
                        obtenerDisponibilidad(
                          libro
                        );

                      return (
                        <tr key={libro.id}>
                          <td>
                            <div className="libro-identidad">
                              <span>
                                {libro.titulo
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>

                              <div>
                                <strong>
                                  {libro.titulo}
                                </strong>

                                <small>
                                  {libro.autor}
                                </small>

                                <small>
                                  ISBN: {libro.isbn}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="libro-clasificacion">
                              <span>
                                {libro.categoria ||
                                  "General"}
                              </span>

                              <small>
                                {libro.editorial ||
                                  "Sin editorial"}
                              </small>

                              <small>
                                {libro.anio_publicacion ||
                                  "Año no registrado"}
                              </small>
                            </div>
                          </td>

                          <td>
                            <div className="libro-existencias">
                              <strong>
                                {
                                  libro.ejemplares_disponibles
                                }
                                /
                                {
                                  libro.cantidad_total
                                }
                              </strong>

                              <small>
                                disponibles / total
                              </small>
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                disponibilidad.clase
                              }
                            >
                              {
                                disponibilidad.texto
                              }
                            </span>
                          </td>

                          <td>
                            <span
                              className={
                                libro.activo
                                  ? "estado-etiqueta estado-etiqueta--activo"
                                  : "estado-etiqueta estado-etiqueta--inactivo"
                              }
                            >
                              {libro.activo
                                ? "Activo"
                                : "Inactivo"}
                            </span>

                            <small className="libro-fecha">
                              {formatearFecha(
                                libro.fecha_registro
                              )}
                            </small>
                          </td>

                          <td>
                            <div className="libro-acciones">
                              <button
                                type="button"
                                className="accion-editar"
                                onClick={() =>
                                  editarLibro(libro)
                                }
                                disabled={
                                  guardando ||
                                  cambiandoEstadoId ===
                                    libro.id
                                }
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                className={
                                  libro.activo
                                    ? "accion-desactivar"
                                    : "accion-activar"
                                }
                                onClick={() =>
                                  cambiarEstado(
                                    libro
                                  )
                                }
                                disabled={
                                  guardando ||
                                  cambiandoEstadoId ===
                                    libro.id
                                }
                              >
                                {cambiandoEstadoId ===
                                libro.id
                                  ? "Procesando..."
                                  : libro.activo
                                    ? "Desactivar"
                                    : "Activar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            )}
          </div>

          <footer className="libros-listado-footer">
            Mostrando {librosFiltrados.length} de{" "}
            {libros.length} libros
          </footer>
        </article>
      </section>
    </div>
  );
}