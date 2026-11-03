import { supabase } from './config.js';

let imagenFile = null;
const overlay = document.getElementById("overlayCarga");

document.addEventListener("DOMContentLoaded", async () => {

  tinymce.init({
    selector: '#resumen',
    height: 300,
    menubar: true,
    plugins: 'lists link',
    toolbar: 'bold italic underline | bullist numlist | link'
  });
  
  const {
      data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
      window.location.href = "index.html";
  }
  // ✅ mostrar usuario  
  const {
    data: { user }
  } = await supabase.auth.getUser();
  document.getElementById("usuarioNombre").textContent = user.email;

  // ✅ botón logout
  document.getElementById("btnLogout").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "index.html";
  });

  document.getElementById("overlayCarga").classList.add("oculto");
  // Leer parámetros de la URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const from = params.get("from");

  document.getElementById("volver").addEventListener("click", () => {
    //alert("Volver sin guardar");
    if (from === "libro" && id) {
      // ✅ vuelve al libro que estabas editando
      window.location.href = `libro.html?id=${id}`;
    } else if (from === "leidos") {
      // ✅ venías del buscador
      window.location.href = "leidos.html";
    } else {
      // ✅ caso general: vuelve a leídos
      window.location.href = "buscar.html";
    }

  });


  // ✅ Cachear elementos UNA VEZ (ARRIBA DEL TODO)
  const elTituloOriginal = document.getElementById("tituloOriginal");
  const elAutor = document.getElementById("autor");
  const elTitulo = document.getElementById("titulo");
  const elFechaInicio = document.getElementById("fechaInicio");
  const elFechaFin = document.getElementById("fechaFin");
  const elValoracion = document.getElementById("valoracion");
  const elResumen = tinymce.get("resumen");
  const img = document.getElementById("portada");
  const inputImagen = document.getElementById("inputImagen");

  const portadaDefault = "https://kijdjantydlyacjvvhkt.supabase.co/storage/v1/object/public/portadas/no-cover.jpg";

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

      // ✅ YA NO USAMOS error
      if (libro) {
        elTituloOriginal.value = libro.tituloOriginal || "";
        elAutor.value = libro.autor || "";
        elTitulo.value = libro.titulo || "";
        elFechaInicio.value = libro.inicio || "";
        elFechaFin.value = libro.fin || "";
        elValoracion.value = libro.nota;
        elResumen.setContent(libro.resumen || "");

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
    //elFechaFin.value = hoy;
  }

  const datosCompletar = JSON.parse(localStorage.getItem("completarFicha"));

  if (datosCompletar) {
    if (datosCompletar.tituloOriginal) {
      document.getElementById("tituloOriginal").value = datosCompletar.tituloOriginal;
    }
    if (datosCompletar.autor) {
      document.getElementById("autor").value = datosCompletar.autor;
    }
    if (datosCompletar.portada) {
      document.getElementById("portada").src = datosCompletar.portada;
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


  document.getElementById("guardar").addEventListener("click", async () => {

    const overlay = document.getElementById("overlayCarga");
    const mensaje = document.querySelector(".mensaje-carga");

    overlay.classList.remove("oculto");
    mensaje.textContent = "Guardando libro...";

    const portadaDefault = "https://kijdjantydlyacjvvhkt.supabase.co/storage/v1/object/public/portadas/no-cover.jpg";

    const portadaActual = document.getElementById("portada").src;

    let archivoParaSubir = null;

    try {

      // ✅ 1. DETERMINAR ARCHIVO A ENVIAR
      if (!portadaActual.includes("no-cover.jpg")){
        if (imagenFile) {
          // ✅ usuario ha seleccionado imagen
          archivoParaSubir = imagenFile;

        } else {
          // ✅ imagen externa (OpenLibrary) → descargarla
          const respuesta = await fetch(portadaActual);
          const blob = await respuesta.blob();

          const nombreArchivo = Date.now() + ".jpg";
          archivoParaSubir = new File([blob], nombreArchivo, { type: blob.type });
        }
      }



      const notaValue = document.getElementById("valoracion").value;

      // ✅ archivo solo si existe
      let urlPortada = portadaActual;

      if (archivoParaSubir) {

        const extension =
            archivoParaSubir.name.split(".").pop();

        const nombreArchivo =
            `${Date.now()}.${extension}`;

        const { error: uploadError } =
            await supabase.storage
                .from("portadas")
                .upload(
                    nombreArchivo,
                    archivoParaSubir,
                    {
                        upsert: true
                    }
                );
                

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

      // ✅ 3. FETCH
      let libro;

      if (id) {
          const { data, error } = await supabase
              .from("libros")
              .update({
                  titulo: elTitulo.value,
                  titulo_original: elTituloOriginal.value,
                  autor: elAutor.value,
                  inicio: elFechaInicio.value,
                  fin: elFechaFin.value,
                  nota: parseFloat(elValoracion.value) || 0,
                  resumen: tinymce.get("resumen").getContent(),
                  portada: urlPortada,
                  email: user.email
              })
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
              .insert([
                  {
                      titulo: elTitulo.value,
                      titulo_original: elTituloOriginal.value,
                      autor: elAutor.value,
                      inicio: elFechaInicio.value,
                      fin: elFechaFin.value,
                      nota: parseFloat(elValoracion.value) || 0,
                      resumen: tinymce.get("resumen").getContent(),
                      portada: urlPortada,
                      email: user.email
                  }
              ])
              .select()
              .single();

          if (error) {
              throw error;
          }

          libro = data;
      }

      console.log("Libro guardado:", libro);

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
      titulo: document.getElementById("titulo").value,
      resumen: tinymce.get("resumen").getContent(),
      inicio: document.getElementById("fechaInicio").value,
      fin: document.getElementById("fechaFin").value,
      nota: document.getElementById("valoracion").value
    };

    localStorage.setItem("fichaTemp", JSON.stringify(datosFicha));
    window.location.href = `buscar.html?from=ficha&id=${id || ""}`;
  });


});
