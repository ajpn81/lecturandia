import { supabase } from './config.js';
import { exigirSesion, cerrarSesion } from './sesion.js';

let imagenFile = null;
let portadaOriginal = null; // portada que tenía el libro al cargarlo (modo edición)

const portadaDefault = "https://kijdjantydlyacjvvhkt.supabase.co/storage/v1/object/public/portadas/no-cover.jpg";

// Prefijo de URL pública de tu bucket
const PREFIJO_BUCKET = "https://kijdjantydlyacjvvhkt.supabase.co/storage/v1/object/public/portadas/";

// Devuelve el nombre del archivo si la URL es de tu bucket y NO es la portada por defecto
function nombreArchivoEnBucket(url) {
  if (!url || !url.startsWith(PREFIJO_BUCKET)) return null;
  const nombre = decodeURIComponent(url.slice(PREFIJO_BUCKET.length).split("?")[0]);
  return nombre === "no-cover.jpg" ? null : nombre;
}

document.addEventListener("DOMContentLoaded", async () => {

  // ✅ Esperamos a que TinyMCE esté realmente inicializado
  await new Promise((resolve) => {
    tinymce.init({
      selector: '#resumen',
      height: 300,
      menubar: true,
      plugins: 'lists link',
      toolbar: 'bold italic underline | bullist numlist | link',
      setup: (editor) => {
        editor.on('init', resolve);
      }
    });
  });

  const session = await exigirSesion();
  if (!session) return;

  // ✅ mostrar usuario
  const user = session.user;
  document.getElementById("usuarioNombre").textContent = user.email;

  // ✅ botón logout
  document.getElementById("btnLogout").addEventListener("click", () => cerrarSesion());

  document.getElementById("overlayCarga").classList.add("oculto");

  // Leer parámetros de la URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const from = params.get("from");

  document.getElementById("volver").addEventListener("click", () => {
    if (from === "libro" && id) {
      // ✅ vuelve al libro que estabas editando
      window.location.href = `libro.html?id=${id}`;
    } else if (from === "leidos") {
      // ✅ venías del buscador
      window.location.href = "leidos.html";
    } else {
      // ✅ caso general
      window.location.href = "buscar.html";
    }
  });

  // ✅ Cachear elementos UNA VEZ
  const elTituloOriginal = document.getElementById("tituloOriginal");
  const elAutor = document.getElementById("autor");
  const elTitulo = document.getElementById("titulo");
  const elFechaInicio = document.getElementById("fechaInicio");
  const elFechaFin = document.getElementById("fechaFin");
  const elValoracion = document.getElementById("valoracion");
  const elResumen = tinymce.get("resumen");
  const img = document.getElementById("portada");
  const inputImagen = document.getElementById("inputImagen");

  // ✅ función reutilizable
  function setPortada(src) {
    img.src = src || portadaDefault;
    img.onerror = () => {
      img.src = portadaDefault;
    };
  }

  // ✅ ----------------------
  // ✅ MODO EDICIÓN / NUEVO
  // ✅ ----------------------

  if (id) {

    try {
      const { data: libro, error } = await supabase
        .from("libros")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw new Error("Libro no encontrado");
      }

      if (libro) {
        elTituloOriginal.value = libro.titulo_original || libro.tituloOriginal || "";
        elAutor.value = libro.autor || "";
        elTitulo.value = libro.titulo || "";
        elFechaInicio.value = libro.inicio || "";
        elFechaFin.value = libro.fin || "";
        elValoracion.value = libro.nota;
        elResumen.setContent(libro.resumen || "");

        portadaOriginal = libro.portada || null; // 👈 guardamos la portada original
        setPortada(libro.portada);
      }

    } catch (err) {
      console.error("Error cargando libro:", err);
    }

  } else {

    const tituloOriginal = params.get("titulo");
    const autor = params.get("autor");
    const portada = params.get("portada");
    elTituloOriginal.value = tituloOriginal || "";
    elAutor.value = autor || "";
    elTitulo.value = tituloOriginal || "";
    elValoracion.value = "";

    setPortada(portada);

    const hoy = new Date().toISOString().split("T")[0];
    elFechaInicio.value = hoy;
  }

  const datosCompletar = JSON.parse(localStorage.getItem("completarFicha"));

  if (datosCompletar) {
    if (datosCompletar.tituloOriginal) {
      elTituloOriginal.value = datosCompletar.tituloOriginal;
    }
    if (datosCompletar.autor) {
      elAutor.value = datosCompletar.autor;
    }
    if (datosCompletar.portada) {
      img.src = datosCompletar.portada;
    }
    localStorage.removeItem("completarFicha"); // ✅ limpiar
  }


  // ✅ ----------------------
  // ✅ IMAGEN (ESCUCHAS)
  // ✅ ----------------------

  if (img && inputImagen) {

    img.addEventListener("click", () => {
      inputImagen.click();
    });

    inputImagen.addEventListener("change", (event) => {
      const file = event.target.files[0];

      if (file) {
        imagenFile = file;

        const reader = new FileReader();

        reader.onload = function (e) {
          img.src = e.target.result;
        };

        reader.readAsDataURL(file);
      }
    });
  }


  // ✅ ----------------------
  // ✅ GUARDAR
  // ✅ ----------------------

  document.getElementById("guardar").addEventListener("click", async () => {

    const overlay = document.getElementById("overlayCarga");
    const mensaje = document.querySelector(".mensaje-carga");

    overlay.classList.remove("oculto");
    mensaje.textContent = "Guardando libro...";

    const portadaActual = img.src;

    let archivoParaSubir = null;

    try {

      // ✅ 1. DETERMINAR SI HAY QUE SUBIR ARCHIVO
      const esDefault = portadaActual.includes("no-cover.jpg");
      const esDelBucket = portadaActual.startsWith(PREFIJO_BUCKET);

      if (!esDefault) {
        if (imagenFile) {
          // el usuario ha elegido una imagen nueva
          archivoParaSubir = imagenFile;
        } else if (!esDelBucket) {
          // imagen externa (OpenLibrary...) → descargarla y subirla
          const respuesta = await fetch(portadaActual);
          const blob = await respuesta.blob();
          archivoParaSubir = new File([blob], `${Date.now()}.jpg`, { type: blob.type });
        }
        // si es del bucket y no hay imagen nueva → no se sube nada
      }

      // ✅ 2. SUBIR SOLO SI HAY ARCHIVO
      let urlPortada = portadaActual;

      if (archivoParaSubir) {

        const extension = archivoParaSubir.name.split(".").pop();
        const nombreArchivo = `${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("portadas")
          .upload(nombreArchivo, archivoParaSubir, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl }
        } = supabase.storage
          .from("portadas")
          .getPublicUrl(nombreArchivo);

        urlPortada = publicUrl;

        console.log("Imagen subida:", urlPortada);
      }

      // ✅ 3. GUARDAR EN BASE DE DATOS
      let libro;

      const datosLibro = {
        titulo: elTitulo.value,
        titulo_original: elTituloOriginal.value,
        autor: elAutor.value,
        inicio: elFechaInicio.value,
        fin: elFechaFin.value,
        nota: parseFloat(elValoracion.value) || 0,
        resumen: tinymce.get("resumen").getContent(),
        portada: urlPortada,
        email: user.email
      };

      if (id) {
        const { data, error } = await supabase
          .from("libros")
          .update(datosLibro)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        libro = data;

      } else {
        const { data, error } = await supabase
          .from("libros")
          .insert([datosLibro])
          .select()
          .single();

        if (error) {
          throw error;
        }

        libro = data;
      }

      console.log("Libro guardado:", libro);

      // ✅ 4. BORRAR PORTADA ANTERIOR SI HA CAMBIADO
      if (id && portadaOriginal && portadaOriginal !== urlPortada) {
        const nombreAntiguo = nombreArchivoEnBucket(portadaOriginal);

        if (nombreAntiguo) {
          const { error: removeError } = await supabase.storage
            .from("portadas")
            .remove([nombreAntiguo]);

          if (removeError) {
            // no bloqueamos el guardado por esto
            console.warn("No se pudo borrar la portada anterior:", removeError);
          }
        }
      }

      window.location.href = `libro.html?id=${libro.id}&from=ficha`;

    } catch (err) {

      console.error(err);

      mensaje.textContent = err.message || "Error al guardar. Inténtalo de nuevo.";

      setTimeout(() => {
        overlay.classList.add("oculto");
      }, 1500);
    }
  });

  document.getElementById("completarInfo").addEventListener("click", () => {

    const datosFicha = {
      titulo: elTitulo.value,
      resumen: tinymce.get("resumen").getContent(),
      inicio: elFechaInicio.value,
      fin: elFechaFin.value,
      nota: elValoracion.value
    };

    localStorage.setItem("fichaTemp", JSON.stringify(datosFicha));
    window.location.href = `buscar.html?from=ficha&id=${id || ""}`;
  });

});
