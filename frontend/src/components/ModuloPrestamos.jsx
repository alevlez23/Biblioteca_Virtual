/**
 * Módulo de préstamos y devoluciones.
 *
 * Este componente consume tres microservicios: usuarios, libros y préstamos.
 * React presenta los datos y el backend de préstamos realiza las validaciones
 * definitivas antes de descontar o devolver una existencia.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./ModuloPrestamos.css";

import {
  listarUsuarios,
} from "../api/usuariosApi";

import {
  listarLibros,
} from "../api/librosApi";

import {
  listarPrestamos,
  registrarDevolucion,
  registrarPrestamo,
} from "../api/prestamosApi";

/** Convierte un objeto Date al formato YYYY-MM-DD usado por los inputs. */
function obtenerFechaLocal(fecha) {
  const anio = fecha.getFullYear();

  const mes = String(
    fecha.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    fecha.getDate()
  ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

/** Propone una fecha límite de catorce días a partir de hoy. */
function obtenerFechaLimiteInicial() {
  const fecha = new Date();

  fecha.setDate(
    fecha.getDate() + 14
  );

  return obtenerFechaLocal(fecha);
}

/** Genera un formulario nuevo; se usa una función para recalcular la fecha. */
function crearFormularioVacio() {
  return {
    usuario_id: "",
    libro_id: "",
    fecha_limite:
      obtenerFechaLimiteInicial(),
    observaciones: "",
  };
}

/** Interpreta valores booleanos que pueden llegar desde PostgreSQL como texto. */
function convertirBooleano(valor) {
  return [
    true,
    1,
    "1",
    "t",
    "true",
    "TRUE",
  ].includes(valor);
}

/** Formatea una fecha sin hora para mostrarla en la tabla. */
function formatearFecha(fecha) {
  if (!fecha) {
    return "No registrada";
  }

  const textoFecha = String(fecha);

  const fechaNormalizada =
    textoFecha.length === 10
      ? `${textoFecha}T00:00:00`
      : textoFecha.includes("T")
        ? textoFecha
        : textoFecha.replace(
            " ",
            "T"
          );

  const objetoFecha = new Date(
    fechaNormalizada
  );

  if (
    Number.isNaN(
      objetoFecha.getTime()
    )
  ) {
    return textoFecha;
  }

  return new Intl.DateTimeFormat(
    "es-EC",
    {
      dateStyle: "medium",
    }
  ).format(objetoFecha);
}

/** Formatea fecha y hora de préstamo o devolución. */
function formatearFechaHora(fecha) {
  if (!fecha) {
    return "No registrada";
  }

  const textoFecha = String(fecha);

  const fechaNormalizada =
    textoFecha.includes("T")
      ? textoFecha
      : textoFecha.replace(
          " ",
          "T"
        );

  const objetoFecha = new Date(
    fechaNormalizada
  );

  if (
    Number.isNaN(
      objetoFecha.getTime()
    )
  ) {
    return textoFecha;
  }

  return new Intl.DateTimeFormat(
    "es-EC",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(objetoFecha);
}

/** Devuelve la clase CSS correspondiente a ACTIVO, DEVUELTO o VENCIDO. */
function obtenerClaseEstado(estado) {
  const estadoNormalizado =
    String(
      estado || "ACTIVO"
    ).toUpperCase();

  if (
    estadoNormalizado ===
    "DEVUELTO"
  ) {
    return "estado-badge devuelto";
  }

  if (
    estadoNormalizado ===
    "VENCIDO"
  ) {
    return "estado-badge vencido";
  }

  return "estado-badge activo";
}

/** Usa el nombre relacionado o un texto de respaldo si el servicio no respondió. */
function obtenerNombreUsuario(
  prestamo
) {
  // Vista del módulo: cabecera, estadísticas, formulario, filtros y tabla.
  return (
    prestamo.usuario?.nombre ||
    `Usuario #${prestamo.usuario_id}`
  );
}

/** Obtiene el correo relacionado con un valor alternativo seguro. */
function obtenerCorreoUsuario(
  prestamo
) {
  return (
    prestamo.usuario?.correo ||
    "Correo no disponible"
  );
}

/** Obtiene el título del libro o muestra su identificador. */
function obtenerTituloLibro(
  prestamo
) {
  return (
    prestamo.libro?.titulo ||
    `Libro #${prestamo.libro_id}`
  );
}

/** Obtiene el autor o un texto alternativo. */
function obtenerAutorLibro(
  prestamo
) {
  return (
    prestamo.libro?.autor ||
    "Autor no disponible"
  );
}

/** Componente principal del proceso de circulación de ejemplares. */
export default function ModuloPrestamos({
  token,
}) {
  // Datos recibidos de las tres API y estados de la interfaz.
  const [usuarios, setUsuarios] =
    useState([]);

  const [libros, setLibros] =
    useState([]);

  const [prestamos, setPrestamos] =
    useState([]);

  const [formulario, setFormulario] =
    useState(crearFormularioVacio);

  const [busqueda, setBusqueda] =
    useState("");

  const [filtroEstado, setFiltroEstado] =
    useState("TODOS");

  const [cargando, setCargando] =
    useState(true);

  const [guardando, setGuardando] =
    useState(false);

  const [
    procesandoPrestamoId,
    setProcesandoPrestamoId,
  ] = useState(null);

  const [mensaje, setMensaje] =
    useState("");

  const [error, setError] =
    useState("");

  /**
   * Ejecuta las tres consultas en paralelo con Promise.all. Así la pantalla no
   * espera una API antes de comenzar la siguiente.
   */
  const cargarDatos = useCallback(
    async () => {
      setCargando(true);
      setError("");

      try {
        const [
          respuestaUsuarios,
          respuestaLibros,
          respuestaPrestamos,
        ] = await Promise.all([
          listarUsuarios(token),
          listarLibros(token),
          listarPrestamos(token),
        ]);

        /*
         * Los nombres correctos devueltos
         * por las tres API son:
         *
         * usuarios
         * libros
         * prestamos
         */
        setUsuarios(
          Array.isArray(
            respuestaUsuarios.usuarios
          )
            ? respuestaUsuarios.usuarios
            : []
        );

        setLibros(
          Array.isArray(
            respuestaLibros.libros
          )
            ? respuestaLibros.libros
            : []
        );

        setPrestamos(
          Array.isArray(
            respuestaPrestamos.prestamos
          )
            ? respuestaPrestamos.prestamos
            : []
        );

        return true;
      } catch (solicitudError) {
        setError(
          solicitudError.message ||
            "No fue posible cargar la información de los microservicios."
        );

        return false;
      } finally {
        setCargando(false);
      }
    },
    [token]
  );

  // Carga inicial al montar el módulo.
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Solo los lectores activos se ofrecen en el selector de préstamos.
  const usuariosActivos = useMemo(
    () =>
      usuarios
        .filter((usuario) =>
          convertirBooleano(
            usuario.activo
          )
        )
        .sort(
          (
            primerUsuario,
            segundoUsuario
          ) =>
            String(
              primerUsuario.nombre
            ).localeCompare(
              String(
                segundoUsuario.nombre
              ),
              "es"
            )
        ),
    [usuarios]
  );

  // Solo aparecen libros activos con al menos una existencia disponible.
  const librosDisponibles = useMemo(
    () =>
      libros
        .filter(
          (libro) =>
            convertirBooleano(
              libro.activo
            ) &&
            Number(
              libro
                .ejemplares_disponibles
            ) > 0
        )
        .sort(
          (
            primerLibro,
            segundoLibro
          ) =>
            String(
              primerLibro.titulo
            ).localeCompare(
              String(
                segundoLibro.titulo
              ),
              "es"
            )
        ),
    [libros]
  );

  // Aplica simultáneamente el filtro por estado y la búsqueda de texto.
  const prestamosFiltrados =
    useMemo(() => {
      const termino = busqueda
        .trim()
        .toLocaleLowerCase();

      return prestamos.filter(
        (prestamo) => {
          const estado =
            String(
              prestamo.estado ||
                "ACTIVO"
            ).toUpperCase();

          const coincideEstado =
            filtroEstado === "TODOS" ||
            estado === filtroEstado;

          if (!coincideEstado) {
            return false;
          }

          if (!termino) {
            return true;
          }

          const contenido = [
            prestamo.id,
            prestamo.usuario_id,
            prestamo.libro_id,
            obtenerNombreUsuario(
              prestamo
            ),
            obtenerCorreoUsuario(
              prestamo
            ),
            obtenerTituloLibro(
              prestamo
            ),
            obtenerAutorLibro(
              prestamo
            ),
            prestamo.libro?.isbn,
            prestamo.estado,
            prestamo.fecha_prestamo,
            prestamo.fecha_limite,
            prestamo.fecha_devolucion,
            prestamo.observaciones,
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase();

          return contenido.includes(
            termino
          );
        }
      );
    }, [
      busqueda,
      filtroEstado,
      prestamos,
    ]);

  // Conteos para las cuatro tarjetas de resumen.
  const totalActivos =
    prestamos.filter(
      (prestamo) =>
        String(
          prestamo.estado
        ).toUpperCase() ===
        "ACTIVO"
    ).length;

  const totalDevueltos =
    prestamos.filter(
      (prestamo) =>
        String(
          prestamo.estado
        ).toUpperCase() ===
        "DEVUELTO"
    ).length;

  const totalVencidos =
    prestamos.filter(
      (prestamo) =>
        String(
          prestamo.estado
        ).toUpperCase() ===
        "VENCIDO"
    ).length;

  /** Actualiza el campo modificado sin reemplazar el resto del formulario. */
  const cambiarCampo = (evento) => {
    const { name, value } =
      evento.target;

    setFormulario(
      (formularioActual) => ({
        ...formularioActual,
        [name]: value,
      })
    );
  };

  /** Limpia datos, mensajes y vuelve a calcular la fecha límite. */
  const limpiarFormulario = () => {
    setFormulario(
      crearFormularioVacio()
    );

    setMensaje("");
    setError("");
  };

  /** Comprueba identificadores, fecha límite y extensión de observaciones. */
  const validarFormulario = () => {
    const usuarioId = Number(
      formulario.usuario_id
    );

    const libroId = Number(
      formulario.libro_id
    );

    if (
      !Number.isInteger(usuarioId) ||
      usuarioId < 1
    ) {
      return "Selecciona un usuario válido.";
    }

    if (
      !Number.isInteger(libroId) ||
      libroId < 1
    ) {
      return "Selecciona un libro válido.";
    }

    if (!formulario.fecha_limite) {
      return "Selecciona la fecha límite del préstamo.";
    }

    const fechaActual =
      obtenerFechaLocal(
        new Date()
      );

    if (
      formulario.fecha_limite <
      fechaActual
    ) {
      return "La fecha límite no puede ser anterior a hoy.";
    }

    if (
      formulario.observaciones
        .trim().length > 255
    ) {
      return "Las observaciones no pueden superar los 255 caracteres.";
    }

    return null;
  };

  /**
   * Envía el préstamo al backend. Después de una respuesta correcta vuelve a
   * consultar los tres servicios para reflejar la nueva disponibilidad.
   */
  const guardarPrestamo = async (
    evento
  ) => {
    evento.preventDefault();

    setMensaje("");
    setError("");

    const errorValidacion =
      validarFormulario();

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setGuardando(true);

    try {
      const respuesta =
        await registrarPrestamo(
          token,
          {
            usuario_id: Number(
              formulario.usuario_id
            ),
            libro_id: Number(
              formulario.libro_id
            ),
            fecha_limite:
              formulario.fecha_limite,
            observaciones:
              formulario.observaciones.trim(),
          }
        );

      setMensaje(
        respuesta.mensaje ||
          "Préstamo registrado correctamente."
      );

      setFormulario(
        crearFormularioVacio()
      );

      await cargarDatos();
    } catch (solicitudError) {
      setError(
        solicitudError.message ||
          "No fue posible registrar el préstamo."
      );
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Pide confirmación, registra la devolución y actualiza préstamos y libros.
   */
  const devolverPrestamo = async (
    prestamo
  ) => {
    const confirmado =
      window.confirm(
        `¿Registrar la devolución de "${obtenerTituloLibro(
          prestamo
        )}"?`
      );

    if (!confirmado) {
      return;
    }

    setMensaje("");
    setError("");

    setProcesandoPrestamoId(
      prestamo.id
    );

    try {
      const respuesta =
        await registrarDevolucion(
          token,
          prestamo.id
        );

      setMensaje(
        respuesta.mensaje ||
          "Devolución registrada correctamente."
      );

      await cargarDatos();
    } catch (solicitudError) {
      setError(
        solicitudError.message ||
          "No fue posible registrar la devolución."
      );
    } finally {
      setProcesandoPrestamoId(
        null
      );
    }
  };

  /** Recarga manualmente toda la información relacionada. */
  const actualizarListado =
    async () => {
      setMensaje("");
      setError("");

      const actualizado =
        await cargarDatos();

      if (actualizado) {
        setMensaje(
          "La información fue actualizada desde PostgreSQL."
        );
      }
    };

  return (
    <section className="prestamos-module">
      <article className="prestamos-hero">
        <div>
          <span className="prestamos-kicker">
            Microservicio de préstamos
          </span>

          <h2>
            Gestión de préstamos y
            devoluciones
          </h2>

          <p>
            Registra préstamos, controla
            fechas límite y procesa
            devoluciones de los ejemplares.
          </p>
        </div>

        <span className="prestamos-chip">
          ● API conectada · Puerto 8083
        </span>
      </article>

      <section className="prestamos-stats">
        <article className="prestamo-stat-card">
          <span>
            Total de préstamos
          </span>

          <strong>
            {prestamos.length}
          </strong>

          <small>
            Registros almacenados
          </small>
        </article>

        <article className="prestamo-stat-card">
          <span>
            Préstamos activos
          </span>

          <strong>
            {totalActivos}
          </strong>

          <small>
            Pendientes de devolución
          </small>
        </article>

        <article className="prestamo-stat-card">
          <span>
            Préstamos devueltos
          </span>

          <strong>
            {totalDevueltos}
          </strong>

          <small>
            Procesos finalizados
          </small>
        </article>

        <article className="prestamo-stat-card">
          <span>
            Préstamos vencidos
          </span>

          <strong>
            {totalVencidos}
          </strong>

          <small>
            Fuera de la fecha límite
          </small>
        </article>
      </section>

      {(mensaje || error) && (
        <div className="prestamos-alertas">
          {mensaje && (
            <div className="alerta ok">
              {mensaje}
            </div>
          )}

          {error && (
            <div className="alerta error">
              {error}
            </div>
          )}
        </div>
      )}

      <section className="prestamos-grid">
        <article className="prestamos-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">
                Nuevo registro
              </span>

              <h3>
                Registrar préstamo
              </h3>
            </div>

            <button
              type="button"
              className="btn-secundario"
              onClick={limpiarFormulario}
              disabled={guardando}
            >
              Limpiar
            </button>
          </div>

          <form
            className="prestamo-form"
            onSubmit={guardarPrestamo}
          >
            <div className="form-grid">
              <label className="field">
                <span>Usuario</span>

                <select
                  name="usuario_id"
                  value={
                    formulario.usuario_id
                  }
                  onChange={cambiarCampo}
                  disabled={
                    cargando ||
                    guardando
                  }
                >
                  <option value="">
                    Selecciona un usuario
                  </option>

                  {usuariosActivos.map(
                    (usuario) => (
                      <option
                        key={usuario.id}
                        value={usuario.id}
                      >
                        {usuario.nombre} —{" "}
                        {usuario.correo}
                      </option>
                    )
                  )}
                </select>

                {!cargando &&
                  usuariosActivos.length ===
                    0 && (
                    <small className="field-counter">
                      No existen usuarios
                      activos.
                    </small>
                  )}
              </label>

              <label className="field">
                <span>Libro</span>

                <select
                  name="libro_id"
                  value={
                    formulario.libro_id
                  }
                  onChange={cambiarCampo}
                  disabled={
                    cargando ||
                    guardando
                  }
                >
                  <option value="">
                    Selecciona un libro
                  </option>

                  {librosDisponibles.map(
                    (libro) => (
                      <option
                        key={libro.id}
                        value={libro.id}
                      >
                        {libro.titulo} —{" "}
                        {
                          libro.ejemplares_disponibles
                        }{" "}
                        disponible(s)
                      </option>
                    )
                  )}
                </select>

                {!cargando &&
                  librosDisponibles.length ===
                    0 && (
                    <small className="field-counter">
                      No existen libros
                      activos con ejemplares
                      disponibles.
                    </small>
                  )}
              </label>

              <label className="field">
                <span>
                  Fecha límite
                </span>

                <input
                  type="date"
                  name="fecha_limite"
                  value={
                    formulario.fecha_limite
                  }
                  min={obtenerFechaLocal(
                    new Date()
                  )}
                  onChange={cambiarCampo}
                  disabled={guardando}
                />
              </label>

              <label className="field field-full">
                <span>
                  Observaciones
                </span>

                <textarea
                  name="observaciones"
                  value={
                    formulario.observaciones
                  }
                  onChange={cambiarCampo}
                  rows="4"
                  maxLength="255"
                  placeholder="Información adicional del préstamo..."
                  disabled={guardando}
                />

                <small className="field-counter">
                  {
                    formulario
                      .observaciones.length
                  }
                  /255
                </small>
              </label>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-principal"
                disabled={
                  cargando ||
                  guardando ||
                  usuariosActivos.length ===
                    0 ||
                  librosDisponibles.length ===
                    0
                }
              >
                {guardando
                  ? "Registrando..."
                  : "Registrar préstamo"}
              </button>
            </div>
          </form>
        </article>

        <article className="prestamos-card">
          <div className="card-header">
            <div>
              <span className="card-kicker">
                Historial PostgreSQL
              </span>

              <h3>
                Préstamos registrados
              </h3>
            </div>

            <button
              type="button"
              className="btn-secundario"
              onClick={
                actualizarListado
              }
              disabled={cargando}
            >
              {cargando
                ? "Actualizando..."
                : "Actualizar"}
            </button>
          </div>

          <div className="prestamos-filtros">
            <input
              type="search"
              placeholder="Buscar por usuario, correo, libro o autor"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(
                  evento.target.value
                )
              }
            />

            <select
              value={filtroEstado}
              onChange={(evento) =>
                setFiltroEstado(
                  evento.target.value
                )
              }
            >
              <option value="TODOS">
                Todos los estados
              </option>

              <option value="ACTIVO">
                Activos
              </option>

              <option value="DEVUELTO">
                Devueltos
              </option>

              <option value="VENCIDO">
                Vencidos
              </option>
            </select>
          </div>

          {cargando ? (
            <div className="estado-vacio">
              Cargando información...
            </div>
          ) : prestamosFiltrados.length ===
            0 ? (
            <div className="estado-vacio">
              No hay préstamos para
              mostrar.
            </div>
          ) : (
            <div className="tabla-contenedor">
              <table className="prestamos-tabla">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Usuario</th>
                    <th>Libro</th>
                    <th>Fechas</th>
                    <th>Estado</th>
                    <th>
                      Observaciones
                    </th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {prestamosFiltrados.map(
                    (prestamo) => {
                      const estado =
                        String(
                          prestamo.estado ||
                            "ACTIVO"
                        ).toUpperCase();

                      const puedeDevolver =
                        estado !==
                        "DEVUELTO";

                      return (
                        <tr
                          key={
                            prestamo.id
                          }
                        >
                          <td className="col-id">
                            {prestamo.id}
                          </td>

                          <td>
                            <div className="tabla-principal">
                              {obtenerNombreUsuario(
                                prestamo
                              )}
                            </div>

                            <div className="tabla-secundaria">
                              {obtenerCorreoUsuario(
                                prestamo
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="tabla-principal">
                              {obtenerTituloLibro(
                                prestamo
                              )}
                            </div>

                            <div className="tabla-secundaria">
                              {obtenerAutorLibro(
                                prestamo
                              )}
                            </div>

                            <div className="tabla-secundaria">
                              ISBN:{" "}
                              {prestamo
                                .libro
                                ?.isbn ||
                                "N/D"}
                            </div>
                          </td>

                          <td>
                            <div className="tabla-principal">
                              Préstamo:{" "}
                              {formatearFechaHora(
                                prestamo.fecha_prestamo
                              )}
                            </div>

                            <div className="tabla-secundaria">
                              Fecha límite:{" "}
                              {formatearFecha(
                                prestamo.fecha_limite
                              )}
                            </div>

                            {prestamo.fecha_devolucion && (
                              <div className="tabla-secundaria">
                                Devolución:{" "}
                                {formatearFechaHora(
                                  prestamo.fecha_devolucion
                                )}
                              </div>
                            )}
                          </td>

                          <td>
                            <span
                              className={obtenerClaseEstado(
                                estado
                              )}
                            >
                              {estado}
                            </span>
                          </td>

                          <td className="tabla-observacion">
                            {prestamo
                              .observaciones ||
                              "Sin observaciones"}
                          </td>

                          <td>
                            {puedeDevolver ? (
                              <button
                                type="button"
                                className="btn-tabla"
                                onClick={() =>
                                  devolverPrestamo(
                                    prestamo
                                  )
                                }
                                disabled={
                                  procesandoPrestamoId ===
                                  prestamo.id
                                }
                              >
                                {procesandoPrestamoId ===
                                prestamo.id
                                  ? "Procesando..."
                                  : "Registrar devolución"}
                              </button>
                            ) : (
                              <span className="texto-finalizado">
                                Finalizado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="tabla-footer">
            Mostrando{" "}
            {prestamosFiltrados.length} de{" "}
            {prestamos.length} préstamos
          </div>
        </article>
      </section>
    </section>
  );
}