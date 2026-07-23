/**
 * Módulo visual para administrar lectores.
 *
 * Aquí consulto usuarios, aplico búsquedas, valido el formulario y actualizo la
 * tabla después de crear, editar, activar o desactivar un registro.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  listarUsuarios,
  registrarUsuario,
} from "../api/usuariosApi";

// Objeto base reutilizado al iniciar un registro o limpiar una edición.
const FORMULARIO_VACIO = {
  nombre: "",
  correo: "",
  telefono: "",
};

/** Convierte la fecha de PostgreSQL a un formato legible para Ecuador. */
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

/** Componente principal del microservicio de usuarios en el frontend. */
export default function ModuloUsuarios({ token }) {
  // Estados de datos, formulario, búsqueda y operaciones en progreso.
  const [usuarios, setUsuarios] = useState([]);
  const [formulario, setFormulario] = useState(
    FORMULARIO_VACIO
  );

  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cambiandoEstadoId, setCambiandoEstadoId] =
    useState(null);

  const [mensaje, setMensaje] = useState(null);

  const nombreInputRef = useRef(null);

  /** Consulta usuarios-service y reemplaza el listado local. */
  const cargarUsuarios = useCallback(async () => {
    setCargando(true);

    try {
      const respuesta = await listarUsuarios(token);

      setUsuarios(
        Array.isArray(respuesta.usuarios)
          ? respuesta.usuarios
          : []
      );
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error.message ||
          "No fue posible cargar los usuarios.",
      });
    } finally {
      setCargando(false);
    }
  }, [token]);

  // La primera consulta se ejecuta al montar el componente o cambiar el token.
  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // useMemo evita repetir el filtro cuando ni el texto ni la lista cambiaron.
  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda
      .trim()
      .toLocaleLowerCase();

    if (!termino) {
      return usuarios;
    }

    return usuarios.filter((usuario) => {
      const contenido = [
        usuario.nombre,
        usuario.correo,
        usuario.telefono,
        usuario.activo ? "activo" : "inactivo",
      ]
        .join(" ")
        .toLocaleLowerCase();

      return contenido.includes(termino);
    });
  }, [busqueda, usuarios]);

  // Las tarjetas de resumen se calculan a partir del listado real.
  const totalActivos = usuarios.filter(
    (usuario) => usuario.activo
  ).length;

  const totalInactivos =
    usuarios.length - totalActivos;

  /** Coloca el cursor en el primer campo después de limpiar o editar. */
  const enfocarNombre = () => {
    window.requestAnimationFrame(() => {
      nombreInputRef.current?.focus();
    });
  };

  /** Restablece campos y abandona el modo edición. */
  const limpiarFormulario = () => {
    setFormulario(FORMULARIO_VACIO);
    setEditandoId(null);
  };

  /** Prepara la interfaz para un registro nuevo. */
  const iniciarNuevoUsuario = () => {
    limpiarFormulario();
    setMensaje(null);
    enfocarNombre();
  };

  /** Actualiza solamente el campo del formulario que produjo el evento. */
  const cambiarCampo = (evento) => {
    const { name, value } = evento.target;

    setFormulario((formularioActual) => ({
      ...formularioActual,
      [name]: value,
    }));
  };

  /** Copia los datos de la fila seleccionada al formulario. */
  const editarUsuario = (usuario) => {
    setFormulario({
      nombre: usuario.nombre || "",
      correo: usuario.correo || "",
      telefono: usuario.telefono || "",
    });

    setEditandoId(usuario.id);
    setMensaje(null);
    enfocarNombre();
  };

  /** Cancela la edición sin modificar la base de datos. */
  const cancelarEdicion = () => {
    limpiarFormulario();

    setMensaje({
      tipo: "informacion",
      texto: "La edición fue cancelada.",
    });
  };

  /**
   * Valida y normaliza el formulario. Según editandoId, registra un lector o
   * actualiza uno existente y luego sincroniza la tabla sin recargar la página.
   */
  const guardarUsuario = async (evento) => {
    evento.preventDefault();
    setMensaje(null);

    const datos = {
      nombre: formulario.nombre.trim(),
      correo: formulario.correo
        .trim()
        .toLocaleLowerCase(),
      telefono: formulario.telefono.trim(),
    };

    if (datos.nombre.length < 2) {
      setMensaje({
        tipo: "error",
        texto:
          "El nombre debe contener al menos dos caracteres.",
      });

      return;
    }

    if (!datos.correo) {
      setMensaje({
        tipo: "error",
        texto: "Escribe el correo electrónico.",
      });

      return;
    }

    setGuardando(true);

    try {
      let respuesta;

      if (editandoId !== null) {
        respuesta = await actualizarUsuario(
          token,
          editandoId,
          datos
        );

        setUsuarios((usuariosActuales) =>
          usuariosActuales.map((usuario) =>
            usuario.id === editandoId
              ? respuesta.usuario
              : usuario
          )
        );
      } else {
        respuesta = await registrarUsuario(
          token,
          datos
        );

        setUsuarios((usuariosActuales) => [
          respuesta.usuario,
          ...usuariosActuales,
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
          "No fue posible guardar el usuario.",
      });
    } finally {
      setGuardando(false);
    }
  };

  /** Envía el estado contrario al actual y sustituye la fila actualizada. */
  const cambiarEstado = async (usuario) => {
    const nuevoEstado = !usuario.activo;

    setMensaje(null);
    setCambiandoEstadoId(usuario.id);

    try {
      const respuesta =
        await cambiarEstadoUsuario(
          token,
          usuario.id,
          nuevoEstado
        );

      setUsuarios((usuariosActuales) =>
        usuariosActuales.map((elemento) =>
          elemento.id === usuario.id
            ? respuesta.usuario
            : elemento
        )
      );

      setMensaje({
        tipo: "correcto",
        texto:
          respuesta.mensaje ||
          "El estado fue actualizado.",
      });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error.message ||
          "No fue posible cambiar el estado.",
      });
    } finally {
      setCambiandoEstadoId(null);
    }
  };

  /** Fuerza una consulta nueva a PostgreSQL mediante la API. */
  const actualizarListado = async () => {
    setMensaje(null);
    await cargarUsuarios();

    setMensaje({
      tipo: "correcto",
      texto: "La lista de usuarios fue actualizada.",
    });
  };

  // La vista se divide en resumen, mensajes, formulario y tabla de resultados.
  return (
    <div className="usuarios-modulo">
      <section className="welcome-card">
        <div>
          <span className="eyebrow">
            Microservicio de usuarios
          </span>

          <h2>Gestión de lectores</h2>

          <p>
            Registra, consulta, edita, activa y
            desactiva usuarios de la Biblioteca
            Virtual.
          </p>
        </div>

        <span className="status">
          API conectada · Puerto 8081
        </span>
      </section>

      <section className="usuarios-resumen">
        <article>
          <span>Total registrados</span>
          <strong>{usuarios.length}</strong>
          <small>Usuarios almacenados</small>
        </article>

        <article>
          <span>Usuarios activos</span>
          <strong>{totalActivos}</strong>
          <small>Disponibles para préstamos</small>
        </article>

        <article>
          <span>Usuarios inactivos</span>
          <strong>{totalInactivos}</strong>
          <small>Acceso suspendido</small>
        </article>
      </section>

      {mensaje && (
        <div
          className={`usuarios-mensaje usuarios-mensaje--${mensaje.tipo}`}
          role="alert"
        >
          <span>
            {mensaje.tipo === "error" ? "!" : "✓"}
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

      <section className="usuarios-contenido">
        <article className="usuarios-panel usuarios-formulario-panel">
          <header className="usuarios-panel-header">
            <div>
              <span className="eyebrow">
                {editandoId !== null
                  ? "Modo edición"
                  : "Nuevo registro"}
              </span>

              <h3>
                {editandoId !== null
                  ? "Editar usuario"
                  : "Registrar usuario"}
              </h3>
            </div>

            <button
              type="button"
              className="boton-secundario"
              onClick={iniciarNuevoUsuario}
              disabled={guardando}
            >
              + Nuevo
            </button>
          </header>

          <form
            className="usuarios-formulario"
            onSubmit={guardarUsuario}
          >
            <label>
              <span>Nombre completo</span>

              <input
                ref={nombreInputRef}
                type="text"
                name="nombre"
                value={formulario.nombre}
                onChange={cambiarCampo}
                placeholder="Ej. María López"
                maxLength={120}
                disabled={guardando}
              />
            </label>

            <label>
              <span>Correo electrónico</span>

              <input
                type="email"
                name="correo"
                value={formulario.correo}
                onChange={cambiarCampo}
                placeholder="usuario@correo.com"
                maxLength={160}
                disabled={guardando}
              />
            </label>

            <label>
              <span>Teléfono</span>

              <input
                type="tel"
                name="telefono"
                value={formulario.telefono}
                onChange={cambiarCampo}
                placeholder="Ej. 0991234567"
                maxLength={30}
                disabled={guardando}
              />
            </label>

            <div className="usuarios-formulario-acciones">
              <button
                type="submit"
                className="boton-primario"
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : editandoId !== null
                    ? "Guardar cambios"
                    : "Registrar usuario"}
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

        <article className="usuarios-panel usuarios-listado-panel">
          <header className="usuarios-panel-header usuarios-listado-header">
            <div>
              <span className="eyebrow">
                Base de datos
              </span>

              <h3>Usuarios registrados</h3>
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

          <div className="usuarios-buscador">
            <span aria-hidden="true">⌕</span>

            <input
              type="search"
              value={busqueda}
              onChange={(evento) =>
                setBusqueda(evento.target.value)
              }
              placeholder="Buscar por nombre, correo, teléfono o estado..."
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

          <div className="usuarios-tabla-contenedor">
            {cargando ? (
              <div className="usuarios-estado-vacio">
                <div className="spinner" />
                <p>Cargando usuarios...</p>
              </div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="usuarios-estado-vacio">
                <strong>
                  No se encontraron usuarios
                </strong>

                <p>
                  Registra un usuario o cambia el texto
                  de búsqueda.
                </p>
              </div>
            ) : (
              <table className="usuarios-tabla">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Contacto</th>
                    <th>Estado</th>
                    <th>Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {usuariosFiltrados.map(
                    (usuario) => (
                      <tr key={usuario.id}>
                        <td>
                          <div className="usuario-identidad">
                            <span>
                              {usuario.nombre
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <div>
                              <strong>
                                {usuario.nombre}
                              </strong>

                              <small>
                                ID #{usuario.id}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="usuario-contacto">
                            <span>
                              {usuario.correo}
                            </span>

                            <small>
                              {usuario.telefono ||
                                "Sin teléfono"}
                            </small>
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              usuario.activo
                                ? "estado-etiqueta estado-etiqueta--activo"
                                : "estado-etiqueta estado-etiqueta--inactivo"
                            }
                          >
                            {usuario.activo
                              ? "Activo"
                              : "Inactivo"}
                          </span>
                        </td>

                        <td>
                          <small className="usuario-fecha">
                            {formatearFecha(
                              usuario.fecha_registro
                            )}
                          </small>
                        </td>

                        <td>
                          <div className="usuario-acciones">
                            <button
                              type="button"
                              className="accion-editar"
                              onClick={() =>
                                editarUsuario(usuario)
                              }
                              disabled={
                                guardando ||
                                cambiandoEstadoId ===
                                  usuario.id
                              }
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className={
                                usuario.activo
                                  ? "accion-desactivar"
                                  : "accion-activar"
                              }
                              onClick={() =>
                                cambiarEstado(usuario)
                              }
                              disabled={
                                guardando ||
                                cambiandoEstadoId ===
                                  usuario.id
                              }
                            >
                              {cambiandoEstadoId ===
                              usuario.id
                                ? "Procesando..."
                                : usuario.activo
                                  ? "Desactivar"
                                  : "Activar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>

          <footer className="usuarios-listado-footer">
            Mostrando {usuariosFiltrados.length} de{" "}
            {usuarios.length} usuarios
          </footer>
        </article>
      </section>
    </div>
  );
}