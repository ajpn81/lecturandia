import { supabase } from './config.js';

// ⏱ AJUSTA AQUÍ LOS TIEMPOS
const MAX_INACTIVIDAD_MIN = 30; // minutos sin tocar nada → se cierra
const MAX_DURACION_HORAS = 8;   // tiempo máximo desde que iniciaste sesión

const CLAVE = "ultimaActividad";
const MAX_INACTIVIDAD = MAX_INACTIVIDAD_MIN * 60 * 1000;
const MAX_DURACION = MAX_DURACION_HORAS * 60 * 60 * 1000;

let inicioSesion = null;
let vigilando = false;
let ultimoRegistro = 0;

function haCaducado() {
  const ahora = Date.now();
  const ultima = Number(localStorage.getItem(CLAVE)) || ahora;

  const porInactividad = ahora - ultima > MAX_INACTIVIDAD;
  const porDuracion = inicioSesion !== null && ahora - inicioSesion > MAX_DURACION;

  return porInactividad || porDuracion;
}

// Guarda "última actividad" (compartida entre pestañas) como mucho cada 15 s
function registrarActividad() {
  const ahora = Date.now();
  if (ahora - ultimoRegistro < 15000) return;

  if (haCaducado()) {
    cerrarSesion(true);
    return;
  }

  ultimoRegistro = ahora;
  localStorage.setItem(CLAVE, String(ahora));
}

export async function cerrarSesion(caducada = false) {
  localStorage.removeItem(CLAVE);
  await supabase.auth.signOut();
  window.location.href = caducada ? "index.html?expirada=1" : "index.html";
}

function vigilar() {
  if (vigilando) return;
  vigilando = true;

  ["click", "keydown", "mousemove", "touchstart", "scroll"].forEach((evento) => {
    window.addEventListener(evento, registrarActividad, { passive: true });
  });

  const comprobar = () => {
    if (haCaducado()) cerrarSesion(true);
  };

  setInterval(comprobar, 60000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) comprobar();
  });
}

// Llámala al cargar cada página privada. Devuelve la sesión o null.
export async function exigirSesion() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "index.html";
    return null;
  }

  const t = new Date(session.user.last_sign_in_at).getTime();
  inicioSesion = Number.isNaN(t) ? null : t;

  if (haCaducado()) {
    await cerrarSesion(true);
    return null;
  }

  registrarActividad();
  vigilar();
  return session;
}
