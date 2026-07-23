/**
 * Historial general y estadísticas de préstamos.
 *
 * Relaciono usuarios, libros y préstamos para construir filtros completos y
 * dos gráficos con Chart.js. Los cálculos se realizan con useMemo para evitar
 * trabajo innecesario en cada actualización visual.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Chart from "chart.js/auto";

import { listarUsuarios } from "../api/usuariosApi";
import { listarLibros } from "../api/librosApi";
import { listarPrestamos } from "../api/prestamosApi";

import "./ModuloHistorial.css";

/** Normaliza booleanos recibidos desde PostgreSQL. */
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

/** Convierte varios formatos de fecha de la API en un objeto Date válido. */
function convertirFecha(fecha) {
  if (!fecha) {
    return null;
  }

  const texto = String(fecha);

  const fechaNormalizada =
    texto.length === 10
      ? `${texto}T00:00:00`
      : texto.includes("T")
        ? texto
        : texto.replace(" ", "T");

  const objetoFecha = new Date(fechaNormalizada);

  if (Number.isNaN(objetoFecha.getTime())) {
    return null;
  }

  return objetoFecha;
}

/** Devuelve YYYY-MM-DD para comparar fechas con los filtros del formulario. */
function obtenerFechaFormulario(fecha) {
  const objetoFecha = convertirFecha(fecha);

  if (!objetoFecha) {
    return "";
  }

  const anio = objetoFecha.getFullYear();

  const mes = String(
    objetoFecha.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    objetoFecha.getDate()
  ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

/** Presenta una fecha en español de Ecuador, con hora cuando se solicita. */
function formatearFecha(
  fecha,
  incluirHora = false
) {
  const objetoFecha = convertirFecha(fecha);

  if (!objetoFecha) {
    return "No registrada";
  }

  const opciones = incluirHora
    ? {
        dateStyle: "medium",
        timeStyle: "short",
      }
    : {
        dateStyle: "medium",
      };

  return new Intl.DateTimeFormat(
    "es-EC",
    opciones
  ).format(objetoFecha);
}

/** Garantiza que todos los estados se comparen en mayúsculas. */
function obtenerEstado(prestamo) {
  return String(
    prestamo.estado || "ACTIVO"
  ).toUpperCase();
}

/** Selecciona la clase visual de cada estado del préstamo. */
function obtenerClaseEstado(estado) {
  switch (estado) {
    case "DEVUELTO":
      return "historial-estado historial-estado--devuelto";

    case "VENCIDO":
      return "historial-estado historial-estado--vencido";

    default:
      return "historial-estado historial-estado--activo";
  }
}

/**
 * Crea el gráfico de dona que compara préstamos activos, devueltos y vencidos.
 * La instancia se destruye al actualizar para que Chart.js no reutilice el
 * mismo canvas dos veces.
 */
function GraficoEstados({
  activos,
  devueltos,
  vencidos,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    /*
     * Evita el error "Canvas is already in use"
     * cuando React StrictMode ejecuta el efecto
     * más de una vez durante el desarrollo.
     */
    Chart.getChart(canvas)?.destroy();

    const total =
      activos + devueltos + vencidos;

    const sinDatos = total === 0;

    const grafico = new Chart(canvas, {
      type: "doughnut",

      data: {
        labels: sinDatos
          ? ["Sin registros"]
          : [
              "Activos",
              "Devueltos",
              "Vencidos",
            ],

        datasets: [
          {
            data: sinDatos
              ? [1]
              : [
                  activos,
                  devueltos,
                  vencidos,
                ],

            backgroundColor: sinDatos
              ? [
                  "rgba(143, 165, 255, 0.18)",
                ]
              : [
                  "rgba(92, 225, 230, 0.82)",
                  "rgba(102, 228, 163, 0.82)",
                  "rgba(255, 167, 93, 0.82)",
                ],

            borderColor: sinDatos
              ? [
                  "rgba(143, 165, 255, 0.45)",
                ]
              : [
                  "rgba(92, 225, 230, 1)",
                  "rgba(102, 228, 163, 1)",
                  "rgba(255, 167, 93, 1)",
                ],

            borderWidth: 1,
            hoverOffset: sinDatos ? 0 : 7,
          },
        ],
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",

        plugins: {
          legend: {
            position: "bottom",

            labels: {
              color: "#b7c3df",
              padding: 18,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },

          tooltip: {
            enabled: !sinDatos,

            backgroundColor:
              "rgba(5, 12, 35, 0.95)",

            titleColor: "#ffffff",
            bodyColor: "#dce6ff",

            borderColor:
              "rgba(92, 225, 230, 0.3)",

            borderWidth: 1,
          },
        },
      },
    });

    return () => {
      grafico.destroy();
    };
  }, [activos, devueltos, vencidos]);

  return (
    <div className="historial-grafico-contenedor">
      <canvas ref={canvasRef} />
    </div>
  );
}

/**
 * Dibuja un gráfico de barras con la cantidad de préstamos de los últimos seis
 * meses y destruye la instancia cuando cambian los datos.
 */
function GraficoMensual({ datos }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return undefined;
    }

    Chart.getChart(canvas)?.destroy();

    const grafico = new Chart(canvas, {
      type: "bar",

      data: {
        labels: datos.map(
          (elemento) => elemento.etiqueta
        ),

        datasets: [
          {
            label: "Préstamos registrados",

            data: datos.map(
              (elemento) => elemento.total
            ),

            backgroundColor:
              "rgba(132, 111, 255, 0.7)",

            borderColor:
              "rgba(132, 111, 255, 1)",

            borderWidth: 1,
            borderRadius: 8,
            maxBarThickness: 50,
          },
        ],
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        scales: {
          x: {
            grid: {
              display: false,
            },

            ticks: {
              color: "#9caaca",
            },

            border: {
              color:
                "rgba(143, 165, 255, 0.12)",
            },
          },

          y: {
            beginAtZero: true,

            ticks: {
              color: "#9caaca",
              precision: 0,
              stepSize: 1,
            },

            grid: {
              color:
                "rgba(143, 165, 255, 0.08)",
            },

            border: {
              color:
                "rgba(143, 165, 255, 0.12)",
            },
          },
        },

        plugins: {
          legend: {
            display: false,
          },

          tooltip: {
            backgroundColor:
              "rgba(5, 12, 35, 0.95)",

            titleColor: "#ffffff",
            bodyColor: "#dce6ff",

            borderColor:
              "rgba(132, 111, 255, 0.35)",

            borderWidth: 1,
          },
        },
      },
    });

    return () => {
      grafico.destroy();
    };
  }, [datos]);

  return (
    <div className="historial-grafico-contenedor">
      <canvas ref={canvasRef} />
    </div>
  );
}

/** Componente principal de reportes, filtros y movimientos. */
export default function ModuloHistorial({
  token,
}) {
  // Fuentes de datos, estados de carga y valores de todos los filtros.
  const [usuarios, setUsuarios] = useState([]);
  const [libros, setLibros] = useState([]);
  const [prestamos, setPrestamos] = useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [mensaje, setMensaje] =
    useState("");

  const [error, setError] =
    useState("");

  const [filtros, setFiltros] = useState({
    busqueda: "",
    usuario_id: "TODOS",
    libro_id: "TODOS",
    estado: "TODOS",
    fecha_desde: "",
    fecha_hasta: "",
  });

  /** Consulta las tres API en paralelo y conserva listas vacías como respaldo. */
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
            "No fue posible cargar el historial."
        );

        return false;
      } finally {
        setCargando(false);
      }
    },
    [token]
  );

  // Carga inicial del historial cuando el token o la función de consulta cambian.
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Combina cada préstamo con los datos de su usuario y libro. Si una relación
  // no está disponible, conserva un objeto de respaldo para no romper la tabla.
  const registros = useMemo(
    () =>
      prestamos.map((prestamo) => {
        const usuario =
          prestamo.usuario ||
          usuarios.find(
            (elemento) =>
              Number(elemento.id) ===
              Number(prestamo.usuario_id)
          ) || {
            id: prestamo.usuario_id,
            nombre:
              `Usuario #${prestamo.usuario_id}`,
            correo:
              "Correo no disponible",
            activo: false,
          };

        const libro =
          prestamo.libro ||
          libros.find(
            (elemento) =>
              Number(elemento.id) ===
              Number(prestamo.libro_id)
          ) || {
            id: prestamo.libro_id,
            titulo:
              `Libro #${prestamo.libro_id}`,
            autor:
              "Autor no disponible",
            isbn: "N/D",
            activo: false,
          };

        return {
          ...prestamo,
          estadoNormalizado:
            obtenerEstado(prestamo),
          usuarioRelacionado: usuario,
          libroRelacionado: libro,
        };
      }),
    [prestamos, usuarios, libros]
  );

  // Evalúa búsqueda, usuario, libro, estado y rango de fechas en una sola pasada.
  const registrosFiltrados = useMemo(() => {
    const termino = filtros.busqueda
      .trim()
      .toLocaleLowerCase();

    return registros.filter((registro) => {
      const usuario =
        registro.usuarioRelacionado;

      const libro =
        registro.libroRelacionado;

      const coincideBusqueda =
        !termino ||
        [
          registro.id,
          usuario.nombre,
          usuario.correo,
          libro.titulo,
          libro.autor,
          libro.isbn,
          registro.estadoNormalizado,
          registro.observaciones,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(termino);

      const coincideUsuario =
        filtros.usuario_id === "TODOS" ||
        Number(registro.usuario_id) ===
          Number(filtros.usuario_id);

      const coincideLibro =
        filtros.libro_id === "TODOS" ||
        Number(registro.libro_id) ===
          Number(filtros.libro_id);

      const coincideEstado =
        filtros.estado === "TODOS" ||
        registro.estadoNormalizado ===
          filtros.estado;

      const fechaPrestamo =
        obtenerFechaFormulario(
          registro.fecha_prestamo
        );

      const coincideFechaDesde =
        !filtros.fecha_desde ||
        fechaPrestamo >=
          filtros.fecha_desde;

      const coincideFechaHasta =
        !filtros.fecha_hasta ||
        fechaPrestamo <=
          filtros.fecha_hasta;

      return (
        coincideBusqueda &&
        coincideUsuario &&
        coincideLibro &&
        coincideEstado &&
        coincideFechaDesde &&
        coincideFechaHasta
      );
    });
  }, [filtros, registros]);

  // Calcula las tarjetas y el gráfico de estados usando solo los resultados visibles.
  const estadisticas = useMemo(() => {
    const activos =
      registrosFiltrados.filter(
        (registro) =>
          registro.estadoNormalizado ===
          "ACTIVO"
      ).length;

    const devueltos =
      registrosFiltrados.filter(
        (registro) =>
          registro.estadoNormalizado ===
          "DEVUELTO"
      ).length;

    const vencidos =
      registrosFiltrados.filter(
        (registro) =>
          registro.estadoNormalizado ===
          "VENCIDO"
      ).length;

    return {
      total: registrosFiltrados.length,
      activos,
      devueltos,
      vencidos,
    };
  }, [registrosFiltrados]);

  // Construye seis meses consecutivos y cuenta los movimientos de cada mes.
  const datosMensuales = useMemo(() => {
    const meses = [];
    const fechaActual = new Date();

    for (
      let desplazamiento = 5;
      desplazamiento >= 0;
      desplazamiento--
    ) {
      const fecha = new Date(
        fechaActual.getFullYear(),
        fechaActual.getMonth() -
          desplazamiento,
        1
      );

      const clave = [
        fecha.getFullYear(),
        String(
          fecha.getMonth() + 1
        ).padStart(2, "0"),
      ].join("-");

      const etiqueta =
        new Intl.DateTimeFormat(
          "es-EC",
          {
            month: "short",
            year: "2-digit",
          }
        ).format(fecha);

      meses.push({
        clave,
        etiqueta,
        total: 0,
      });
    }

    registrosFiltrados.forEach(
      (registro) => {
        const fecha = convertirFecha(
          registro.fecha_prestamo
        );

        if (!fecha) {
          return;
        }

        const clave = [
          fecha.getFullYear(),
          String(
            fecha.getMonth() + 1
          ).padStart(2, "0"),
        ].join("-");

        const mes = meses.find(
          (elemento) =>
            elemento.clave === clave
        );

        if (mes) {
          mes.total += 1;
        }
      }
    );

    return meses;
  }, [registrosFiltrados]);

  /** Actualiza únicamente el filtro que cambió. */
  const cambiarFiltro = (evento) => {
    const { name, value } =
      evento.target;

    setFiltros((filtrosActuales) => ({
      ...filtrosActuales,
      [name]: value,
    }));
  };

  /** Restaura la consulta general sin filtros. */
  const limpiarFiltros = () => {
    setFiltros({
      busqueda: "",
      usuario_id: "TODOS",
      libro_id: "TODOS",
      estado: "TODOS",
      fecha_desde: "",
      fecha_hasta: "",
    });

    setMensaje("");
    setError("");
  };

  /** Solicita nuevamente la información a los microservicios. */
  const actualizarHistorial = async () => {
    setMensaje("");
    setError("");

    const actualizado =
      await cargarDatos();

    if (actualizado) {
      setMensaje(
        "El historial fue actualizado desde los microservicios."
      );
    }
  };

  // Vista final: resumen, filtros, gráficos y tabla detallada.
  return (
    <section className="historial-modulo">
      <article className="historial-hero">
        <div>
          <span className="historial-kicker">
            Reportes y estadísticas
          </span>

          <h2>
            Historial general de préstamos
          </h2>

          <p>
            Consulta movimientos, aplica filtros y
            analiza el estado de los préstamos
            registrados en PostgreSQL.
          </p>
        </div>

        <span className="historial-chip">
          ● Información en tiempo real
        </span>
      </article>

      {mensaje && (
        <div className="historial-alerta historial-alerta--correcta">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="historial-alerta historial-alerta--error">
          {error}
        </div>
      )}

      <section className="historial-estadisticas">
        <article>
          <span>Registros encontrados</span>
          <strong>{estadisticas.total}</strong>
          <small>Resultado de los filtros</small>
        </article>

        <article>
          <span>Préstamos activos</span>
          <strong>{estadisticas.activos}</strong>
          <small>Pendientes de devolución</small>
        </article>

        <article>
          <span>Préstamos devueltos</span>
          <strong>{estadisticas.devueltos}</strong>
          <small>Procesos finalizados</small>
        </article>

        <article>
          <span>Préstamos vencidos</span>
          <strong>{estadisticas.vencidos}</strong>
          <small>Fuera de la fecha límite</small>
        </article>
      </section>

      <article className="historial-panel">
        <header className="historial-panel-header">
          <div>
            <span className="historial-kicker">
              Búsqueda avanzada
            </span>

            <h3>Filtros del historial</h3>
          </div>

          <div className="historial-header-acciones">
            <button
              type="button"
              className="historial-boton-secundario"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>

            <button
              type="button"
              className="historial-boton-principal"
              onClick={actualizarHistorial}
              disabled={cargando}
            >
              {cargando
                ? "Actualizando..."
                : "Actualizar datos"}
            </button>
          </div>
        </header>

        <div className="historial-filtros">
          <label className="historial-filtro historial-filtro--busqueda">
            <span>Buscar</span>

            <input
              type="search"
              name="busqueda"
              value={filtros.busqueda}
              onChange={cambiarFiltro}
              placeholder="Usuario, correo, libro, autor, ISBN..."
            />
          </label>

          <label className="historial-filtro">
            <span>Usuario</span>

            <select
              name="usuario_id"
              value={filtros.usuario_id}
              onChange={cambiarFiltro}
            >
              <option value="TODOS">
                Todos los usuarios
              </option>

              {[...usuarios]
                .sort((primero, segundo) =>
                  String(
                    primero.nombre
                  ).localeCompare(
                    String(segundo.nombre),
                    "es"
                  )
                )
                .map((usuario) => (
                  <option
                    key={usuario.id}
                    value={usuario.id}
                  >
                    {usuario.nombre}
                    {convertirBooleano(
                      usuario.activo
                    )
                      ? ""
                      : " — Inactivo"}
                  </option>
                ))}
            </select>
          </label>

          <label className="historial-filtro">
            <span>Libro</span>

            <select
              name="libro_id"
              value={filtros.libro_id}
              onChange={cambiarFiltro}
            >
              <option value="TODOS">
                Todos los libros
              </option>

              {[...libros]
                .sort((primero, segundo) =>
                  String(
                    primero.titulo
                  ).localeCompare(
                    String(segundo.titulo),
                    "es"
                  )
                )
                .map((libro) => (
                  <option
                    key={libro.id}
                    value={libro.id}
                  >
                    {libro.titulo}
                  </option>
                ))}
            </select>
          </label>

          <label className="historial-filtro">
            <span>Estado</span>

            <select
              name="estado"
              value={filtros.estado}
              onChange={cambiarFiltro}
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
          </label>

          <label className="historial-filtro">
            <span>Desde</span>

            <input
              type="date"
              name="fecha_desde"
              value={filtros.fecha_desde}
              onChange={cambiarFiltro}
              max={
                filtros.fecha_hasta ||
                undefined
              }
            />
          </label>

          <label className="historial-filtro">
            <span>Hasta</span>

            <input
              type="date"
              name="fecha_hasta"
              value={filtros.fecha_hasta}
              onChange={cambiarFiltro}
              min={
                filtros.fecha_desde ||
                undefined
              }
            />
          </label>
        </div>
      </article>

      <section className="historial-graficos">
        <article className="historial-panel historial-grafico-panel">
          <header>
            <span className="historial-kicker">
              Distribución actual
            </span>

            <h3>Préstamos por estado</h3>

            <p>
              Comparación entre préstamos activos,
              devueltos y vencidos.
            </p>
          </header>

          <GraficoEstados
            activos={estadisticas.activos}
            devueltos={estadisticas.devueltos}
            vencidos={estadisticas.vencidos}
          />
        </article>

        <article className="historial-panel historial-grafico-panel">
          <header>
            <span className="historial-kicker">
              Últimos seis meses
            </span>

            <h3>Préstamos registrados por mes</h3>

            <p>
              Evolución mensual según la fecha del
              préstamo.
            </p>
          </header>

          <GraficoMensual
            datos={datosMensuales}
          />
        </article>
      </section>

      <article className="historial-panel">
        <header className="historial-panel-header">
          <div>
            <span className="historial-kicker">
              Base de datos PostgreSQL
            </span>

            <h3>Movimientos registrados</h3>
          </div>

          <span className="historial-resultados">
            Mostrando {registrosFiltrados.length} de{" "}
            {registros.length}
          </span>
        </header>

        {cargando ? (
          <div className="historial-vacio">
            <div className="spinner" />
            <p>Cargando historial...</p>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="historial-vacio">
            <strong>
              No se encontraron registros
            </strong>

            <p>
              Modifica los filtros para consultar
              otros movimientos.
            </p>
          </div>
        ) : (
          <div className="historial-tabla-contenedor">
            <table className="historial-tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Usuario</th>
                  <th>Libro</th>
                  <th>Préstamo</th>
                  <th>Fecha límite</th>
                  <th>Devolución</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>

              <tbody>
                {registrosFiltrados.map(
                  (registro) => (
                    <tr key={registro.id}>
                      <td className="historial-id">
                        {registro.id}
                      </td>

                      <td>
                        <div className="historial-entidad">
                          <strong>
                            {
                              registro
                                .usuarioRelacionado
                                .nombre
                            }
                          </strong>

                          <small>
                            {
                              registro
                                .usuarioRelacionado
                                .correo
                            }
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="historial-entidad">
                          <strong>
                            {
                              registro
                                .libroRelacionado
                                .titulo
                            }
                          </strong>

                          <small>
                            {
                              registro
                                .libroRelacionado
                                .autor
                            }
                          </small>

                          <small>
                            ISBN:{" "}
                            {registro
                              .libroRelacionado
                              .isbn || "N/D"}
                          </small>
                        </div>
                      </td>

                      <td>
                        {formatearFecha(
                          registro.fecha_prestamo,
                          true
                        )}
                      </td>

                      <td>
                        {formatearFecha(
                          registro.fecha_limite
                        )}
                      </td>

                      <td>
                        {registro.fecha_devolucion
                          ? formatearFecha(
                              registro.fecha_devolucion,
                              true
                            )
                          : "Pendiente"}
                      </td>

                      <td>
                        <span
                          className={obtenerClaseEstado(
                            registro.estadoNormalizado
                          )}
                        >
                          {
                            registro.estadoNormalizado
                          }
                        </span>
                      </td>

                      <td className="historial-observaciones">
                        {registro.observaciones ||
                          "Sin observaciones"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}