/**
 * Componente principal de la Biblioteca Virtual.
 *
 * En este archivo controlo el inicio de sesión, la persistencia del token JWT,
 * la validación de una sesión guardada y la navegación entre los módulos.
 * La lógica de usuarios, libros, préstamos e historial se mantiene separada
 * en componentes propios para no convertir App.jsx en un único bloque difícil
 * de mantener.
 */

import { useEffect, useRef, useState } from "react";

import {
  cerrarSesionRemota,
  iniciarSesion,
  obtenerPerfil,
} from "./api/authApi";

import ModuloUsuarios from "./components/ModuloUsuarios";
import ModuloLibros from "./components/ModuloLibros";
import ModuloPrestamos from "./components/ModuloPrestamos";
import ModuloHistorial from "./components/ModuloHistorial";

// Uso una sola clave para guardar la sesión y poder localizarla tanto en
// localStorage como en sessionStorage.
const CLAVE_SESION = "biblioteca_virtual_sesion";

/**
 * Busca una sesión guardada en el navegador.
 *
 * Primero revisa localStorage y después sessionStorage. Si encuentra contenido
 * dañado, lo elimina para evitar que la aplicación quede atrapada intentando
 * leer un JSON inválido.
 */
function leerSesionGuardada() {
  const almacenamientos = [
    window.localStorage,
    window.sessionStorage,
  ];

  for (const almacenamiento of almacenamientos) {
    const contenido =
      almacenamiento.getItem(CLAVE_SESION);

    if (!contenido) {
      continue;
    }

    try {
      return JSON.parse(contenido);
    } catch {
      almacenamiento.removeItem(CLAVE_SESION);
    }
  }

  return null;
}

/**
 * Guarda la sesión en el almacenamiento elegido por la administradora.
 *
 * @param {object} sesion Token y datos básicos del administrador.
 * @param {boolean} mantenerSesion Cuando es true se usa localStorage; de lo
 * contrario la sesión dura solamente mientras la pestaña esté abierta.
 */
function guardarSesion(
  sesion,
  mantenerSesion
) {
  window.localStorage.removeItem(
    CLAVE_SESION
  );

  window.sessionStorage.removeItem(
    CLAVE_SESION
  );

  const almacenamiento =
    mantenerSesion
      ? window.localStorage
      : window.sessionStorage;

  almacenamiento.setItem(
    CLAVE_SESION,
    JSON.stringify(sesion)
  );
}

/**
 * Elimina cualquier copia local de la sesión.
 *
 * Limpio los dos almacenamientos porque el usuario pudo cambiar la opción
 * "Mantener sesión" entre un acceso y otro.
 */
function eliminarSesionGuardada() {
  window.localStorage.removeItem(
    CLAVE_SESION
  );

  window.sessionStorage.removeItem(
    CLAVE_SESION
  );
}

/**
 * Dibuja el contenedor del avatar usado en el login y en la barra superior.
 * La fotografía se aplica desde FotoPerfil.css. El SVG se conserva en la
 * estructura original, aunque la hoja de estilo lo oculta al usar la foto.
 */
function IconoUsuario({
  pequeno = false,
}) {
  return (
    <div
      className={
        pequeno
          ? "avatar avatar--small"
          : "avatar"
      }
      aria-hidden="true"
    >
      <svg viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="27"
          r="15"
        />

        <path
          d="M14 69c2-16 12-24 26-24s24 8 26 24"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * Muestra una pantalla breve mientras el backend confirma que el JWT guardado
 * sigue siendo válido.
 */
function PantallaCarga() {
  return (
    <main className="loading-screen">
      <div className="brand-logo">
        BV
      </div>

      <div className="spinner" />

      <p>
        Verificando tu sesión...
      </p>
    </main>
  );
}

/**
 * Formulario de autenticación.
 *
 * Mantiene los valores escritos, permite mostrar u ocultar la contraseña y
 * entrega la respuesta del backend al componente principal cuando el acceso
 * es correcto.
 */
function Login({
  onSesionIniciada,
}) {
  // Estados del formulario y de la experiencia de usuario.
  const [usuario, setUsuario] =
  useState("alejandra");

  const [
    contrasena,
    setContrasena,
  ] = useState("");

  const [
    mostrarContrasena,
    setMostrarContrasena,
  ] = useState(false);

  const [
    mantenerSesion,
    setMantenerSesion,
  ] = useState(true);

  const [enviando, setEnviando] =
    useState(false);

  const [error, setError] =
    useState("");

  /**
   * Valida los campos básicos y envía las credenciales a auth-service.
   * El backend es quien comprueba realmente el usuario, la contraseña y el
   * estado de la cuenta; el frontend solo evita solicitudes incompletas.
   */
  const enviarFormulario = async (
    evento
  ) => {
    evento.preventDefault();
    setError("");

    if (
      !usuario.trim() ||
      !contrasena
    ) {
      setError(
        "Escribe el usuario y la contraseña."
      );

      return;
    }

    setEnviando(true);

    try {
      const respuesta =
        await iniciarSesion({
          usuario: usuario.trim(),
          contrasena,
        });

      onSesionIniciada(
        respuesta,
        mantenerSesion
      );
    } catch (solicitudError) {
      setError(
        solicitudError.message ||
          "No fue posible iniciar sesión."
      );
    } finally {
      setEnviando(false);
    }
  };

  // La presentación explica el propósito del sistema y la tarjeta derecha
  // contiene el formulario que se conecta con la API de autenticación.
  return (
    <main className="login-page">
      <div className="decoracion decoracion--uno" />
      <div className="decoracion decoracion--dos" />
      <div className="background-grid" />

      <section className="login-container">
        <article className="presentation">
          <header className="brand">
            <div className="brand-logo">
              BV
            </div>

            <div>
              <span>
                Sistema académico
              </span>

              <h1>
                Biblioteca Virtual
              </h1>
            </div>
          </header>

          <div className="presentation-content">
            <span className="tag">
              Gestión inteligente
            </span>

            <h2>
              Todo el conocimiento
              organizado en un mismo
              lugar.
            </h2>

            <p>
              Administra lectores,
              libros y préstamos
              mediante una plataforma
              moderna basada en
              microservicios.
            </p>
          </div>

          <div className="feature-list">
            <article>
              <span>01</span>

              <div>
                <strong>
                  Acceso protegido
                </strong>

                <p>
                  Autenticación mediante
                  API REST y tokens JWT.
                </p>
              </div>
            </article>

            <article>
              <span>02</span>

              <div>
                <strong>
                  Servicios independientes
                </strong>

                <p>
                  Módulos separados para
                  usuarios, libros y
                  préstamos.
                </p>
              </div>
            </article>

            <article>
              <span>03</span>

              <div>
                <strong>
                  Información actualizada
                </strong>

                <p>
                  Datos almacenados
                  directamente en
                  PostgreSQL.
                </p>
              </div>
            </article>
          </div>

          <footer>
            Biblioteca Virtual ·
            CodeIgniter 4
          </footer>
        </article>

        <section className="login-card">
          <div className="login-content">
            <IconoUsuario />

            <header className="login-heading">
              <span>
                Panel administrativo
              </span>

              <h2>
                Iniciar sesión
              </h2>

              <p>
                Ingresa tus credenciales
                para acceder al sistema.
              </p>
            </header>

            <form
              className="login-form"
              onSubmit={
                enviarFormulario
              }
            >
              <label className="field">
                <span>Usuario</span>

                <div className="input-container">
                  <svg viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="8"
                      r="4"
                    />

                    <path d="M4 21c0-5 3-8 8-8s8 3 8 8" />
                  </svg>

                  <input
                    type="text"
                    value={usuario}
                    onChange={(
                      evento
                    ) =>
                      setUsuario(
                        evento.target
                          .value
                      )
                    }
                    placeholder="Ej. alejandra"
                    autoComplete="username"
                    disabled={enviando}
                  />
                </div>
              </label>

              <label className="field">
                <span>
                  Contraseña
                </span>

                <div className="input-container">
                  <svg viewBox="0 0 24 24">
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="3"
                    />

                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>

                  <input
                    type={
                      mostrarContrasena
                        ? "text"
                        : "password"
                    }
                    value={contrasena}
                    onChange={(
                      evento
                    ) =>
                      setContrasena(
                        evento.target
                          .value
                      )
                    }
                    placeholder="Escribe tu contraseña"
                    autoComplete="current-password"
                    disabled={enviando}
                  />

                  <button
                    type="button"
                    className="password-button"
                    onClick={() =>
                      setMostrarContrasena(
                        (valor) =>
                          !valor
                      )
                    }
                    disabled={enviando}
                  >
                    {mostrarContrasena
                      ? "Ocultar"
                      : "Ver"}
                  </button>
                </div>
              </label>

              <div className="login-options">
                <label className="remember">
                  <input
                    type="checkbox"
                    checked={
                      mantenerSesion
                    }
                    onChange={(
                      evento
                    ) =>
                      setMantenerSesion(
                        evento.target
                          .checked
                      )
                    }
                  />

                  <span className="checkmark" />

                  Mantener sesión
                </label>

                <span className="secure-text">
                  Acceso seguro
                </span>
              </div>

              {error && (
                <div
                  className="alert"
                  role="alert"
                >
                  <span>!</span>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="login-button"
                disabled={enviando}
              >
                {enviando ? (
                  <>
                    <span className="button-spinner" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            <p className="security-message">
              <span />

              Tus datos se verifican
              mediante el microservicio
              de autenticación.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

/**
 * Pantalla inicial del panel.
 * Resume las tecnologías usadas y muestra el estado de los cinco módulos.
 */
function Inicio({
  administrador,
}) {
  return (
    <>
      <section className="welcome-card">
        <div>
          <span className="eyebrow">
            Sesión verificada
          </span>

          <h2>
            Bienvenida,{" "}
            {administrador.nombre}.
          </h2>

          <p>
            El sistema utiliza React,
            Fetch API, CodeIgniter 4,
            JWT, microservicios,
            PostgreSQL y Chart.js.
          </p>
        </div>

        <span className="status">
          Sistema conectado
        </span>
      </section>

      <section className="stats">
        <article>
          <span>
            Autenticación
          </span>

          <strong>✓</strong>

          <small>
            Puerto 8080 conectado
          </small>
        </article>

        <article>
          <span>
            Usuarios
          </span>

          <strong>✓</strong>

          <small>
            Puerto 8081 conectado
          </small>
        </article>

        <article>
          <span>
            Libros
          </span>

          <strong>✓</strong>

          <small>
            Puerto 8082 conectado
          </small>
        </article>

        <article>
          <span>
            Préstamos
          </span>

          <strong>✓</strong>

          <small>
            Puerto 8083 conectado
          </small>
        </article>
      </section>

      <section className="progress-panel">
        <div>
          <span className="eyebrow">
            Estado del proyecto
          </span>

          <h3>
            Biblioteca Virtual
            integrada
          </h3>

          <p>
            Los módulos principales
            están conectados con sus
            respectivas API REST y
            bases de datos PostgreSQL.
          </p>
        </div>

        <div className="progress-list">
          <article className="completed">
            <span>01</span>

            <strong>
              Autenticación
            </strong>

            <small>
              Completado
            </small>
          </article>

          <article className="completed">
            <span>02</span>

            <strong>
              Usuarios
            </strong>

            <small>
              Completado
            </small>
          </article>

          <article className="completed">
            <span>03</span>

            <strong>
              Libros
            </strong>

            <small>
              Completado
            </small>
          </article>

          <article className="completed">
            <span>04</span>

            <strong>
              Préstamos
            </strong>

            <small>
              Completado
            </small>
          </article>

          <article className="completed">
            <span>05</span>

            <strong>
              Historial
            </strong>

            <small>
              Gráficas y filtros
            </small>
          </article>
        </div>
      </section>
    </>
  );
}

/**
 * Estructura principal que aparece después del login.
 *
 * La barra lateral cambia el módulo activo sin recargar la página y la barra
 * superior conserva los datos del administrador autenticado.
 */
function Dashboard({
  sesion,
  onCerrarSesion,
}) {
  // Guarda el módulo seleccionado en la barra lateral.
  const [seccion, setSeccion] =
    useState("inicio");

  // Esta lista permite construir el menú y obtener el título actual desde una
  // sola fuente de datos.
  const opciones = [
    {
      id: "inicio",
      numero: "01",
      nombre: "Inicio",
    },
    {
      id: "usuarios",
      numero: "02",
      nombre: "Usuarios",
    },
    {
      id: "libros",
      numero: "03",
      nombre: "Libros",
    },
    {
      id: "prestamos",
      numero: "04",
      nombre: "Préstamos",
    },
    {
      id: "historial",
      numero: "05",
      nombre: "Historial",
    },
  ];

  /** Cambia de módulo y devuelve la vista al inicio de la página. */
  const cambiarSeccion = (
    nuevaSeccion
  ) => {
    setSeccion(nuevaSeccion);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /**
   * Selecciona el componente que corresponde a la opción activa.
   * El mismo token se entrega a cada módulo para autorizar sus solicitudes.
   */
  const mostrarContenido = () => {
    switch (seccion) {
      case "usuarios":
        return (
          <ModuloUsuarios
            token={sesion.token}
          />
        );

      case "libros":
        return (
          <ModuloLibros
            token={sesion.token}
          />
        );

      case "prestamos":
        return (
          <ModuloPrestamos
            token={sesion.token}
          />
        );

      case "historial":
        return (
          <ModuloHistorial
            token={sesion.token}
          />
        );

      default:
        return (
          <Inicio
            administrador={
              sesion.administrador
            }
          />
        );
    }
  };

  const tituloActual =
    opciones.find(
      (opcion) =>
        opcion.id === seccion
    )?.nombre || "Inicio";

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo brand-logo--small">
            BV
          </div>

          <div>
            <strong>
              Biblioteca
            </strong>

            <span>
              Virtual
            </span>
          </div>
        </div>

        <nav>
          {opciones.map(
            (opcion) => (
              <button
                key={opcion.id}
                type="button"
                className={
                  seccion ===
                  opcion.id
                    ? "nav-button active"
                    : "nav-button"
                }
                onClick={() =>
                  cambiarSeccion(
                    opcion.id
                  )
                }
              >
                <span>
                  {opcion.numero}
                </span>

                {opcion.nombre}
              </button>
            )
          )}
        </nav>

        <footer className="sidebar-footer">
          CodeIgniter 4 · API REST
        </footer>
      </aside>

      <section className="dashboard-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              Panel administrativo
            </span>

            <h1>
              {tituloActual}
            </h1>
          </div>

          <div className="profile">
            <IconoUsuario pequeno />

            <div>
              <strong>
                {
                  sesion
                    .administrador
                    .nombre
                }
              </strong>

              <span>
                {
                  sesion
                    .administrador
                    .rol
                }
              </span>
            </div>

            <button
              type="button"
              onClick={
                onCerrarSesion
              }
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {mostrarContenido()}
      </section>
    </main>
  );
}

/**
 * Coordina el ciclo completo de la sesión.
 *
 * 1. Recupera una sesión previa.
 * 2. Consulta /api/auth/perfil para validar el token.
 * 3. Muestra el login o el panel según el resultado.
 * 4. Elimina la información local cuando se cierra la sesión.
 */
export default function App() {
  // useRef evita volver a leer el almacenamiento en cada renderizado.
  const sesionInicial =
    useRef(
      leerSesionGuardada()
    ).current;

  const [sesion, setSesion] =
    useState(sesionInicial);

  const [
    verificando,
    setVerificando,
  ] = useState(
    Boolean(
      sesionInicial?.token
    )
  );

  // Al iniciar la aplicación verifico el JWT guardado contra el backend. La
  // variable componenteActivo evita actualizar estados después de desmontar.
  useEffect(() => {
    let componenteActivo = true;

    if (!sesion?.token) {
      setVerificando(false);
      return undefined;
    }

    obtenerPerfil(sesion.token)
      .then((respuesta) => {
        if (!componenteActivo) {
          return;
        }

        setSesion(
          (sesionActual) => ({
            ...sesionActual,
            administrador:
              respuesta.administrador,
          })
        );
      })
      .catch(() => {
        eliminarSesionGuardada();

        if (componenteActivo) {
          setSesion(null);
        }
      })
      .finally(() => {
        if (componenteActivo) {
          setVerificando(false);
        }
      });

    return () => {
      componenteActivo = false;
    };
  }, [sesion?.token]);

  /** Guarda la respuesta del login y habilita el panel administrativo. */
  const manejarInicioSesion = (
    respuesta,
    mantenerSesion
  ) => {
    const nuevaSesion = {
      token: respuesta.token,
      tipo: respuesta.tipo,
      expiraEn:
        respuesta.expira_en,
      administrador:
        respuesta.administrador,
    };

    guardarSesion(
      nuevaSesion,
      mantenerSesion
    );

    setVerificando(false);
    setSesion(nuevaSesion);
  };

  /**
   * Solicita el cierre remoto y siempre limpia la sesión local.
   * Aunque el servidor esté apagado, la persona debe poder salir del panel.
   */
  const manejarCierreSesion =
    async () => {
      try {
        if (sesion?.token) {
          await cerrarSesionRemota(
            sesion.token
          );
        }
      } catch {
        // La sesión local se
        // cerrará igualmente.
      } finally {
        eliminarSesionGuardada();
        setSesion(null);
        setVerificando(false);
      }
    };

  if (verificando) {
    return <PantallaCarga />;
  }

  if (!sesion) {
    return (
      <Login
        onSesionIniciada={
          manejarInicioSesion
        }
      />
    );
  }

  return (
    <Dashboard
      sesion={sesion}
      onCerrarSesion={
        manejarCierreSesion
      }
    />
  );
}