import { supabase } from './config.js';
import { exigirSesion, cerrarSesion } from './sesion.js';

document.addEventListener("DOMContentLoaded", async () => {

  // ✅ Obtener ID desde URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const from = params.get("from");

  const session = await exigirSesion();
  if (!session) return;

  // ✅ mostrar usuario  
  const user = session.user;
  document.getElementById("usuarioNombre").textContent = user.email;

  // ✅ botón logout
  document.getElementById("btnLogout").addEventListener("click", () => cerrarSesion());

  if (!id) return;

 const { data: libro, error } = await supabase
    .from("libros")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
      console.error("Error obteniendo libro:", error);
      return;
  }

  // ✅ Rellenar datos
  document.getElementById("titulo").textContent = libro.titulo;
  if (libro.tituloOriginal != libro.titulo || libro.tituloOriginal==="") {
    document.getElementById("tituloOriginal").textContent = libro.tituloOriginal;
  } else {
    document.getElementById("tituloOriginal").textContent = "";
  }

  document.getElementById("autor").textContent = libro.autor;
  document.getElementById("fechaInicio").textContent = formatearFecha(libro.inicio);
  document.getElementById("fechaFin").textContent = formatearFecha(libro.fin);
  document.getElementById("valoracion").textContent = libro.nota;
  //document.getElementById("resumen").textContent = libro.resumen;
  document.getElementById("resumen").innerHTML = libro.resumen;


  // ✅ Imagen
  const portadaDefault = "https://kijdjantydlyacjvvhkt.supabase.co/storage/v1/object/public/portadas/no-cover.jpg";

  const img = document.getElementById("portada");
  img.src = libro.portada || portadaDefault;
  img.onerror = () => img.src = portadaDefault;

  // ✅ Calcular días
  if (libro.inicio && libro.fin) {
    const inicio = new Date(libro.inicio);
    const fin = new Date(libro.fin);

    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));

    document.getElementById("dias").textContent = dias;
  }else{
    document.getElementById("dias").textContent = "En lectura";
  }
  document.getElementById("editar").addEventListener("click", () => {

    window.location.href = `ficha.html?id=${libro.id}&from=libro`;

  });

  document.getElementById("volver").addEventListener("click", () => {
    window.location.href = "leidos.html";
  });

  document.getElementById("borrar").addEventListener("click", async () => {

    const modal = document.getElementById("modalConfirmacion");
    const btnBorrar = document.getElementById("borrar");
    const btnSi = document.getElementById("confirmarSi");
    const btnNo = document.getElementById("confirmarNo");

    //btnBorrar.addEventListener("click", () => {
    modal.classList.remove("oculto");
    //});
    btnNo.addEventListener("click", () => {
      modal.classList.add("oculto");
    });

    btnSi.addEventListener("click", async () => {

      try {
        // 1. Borrar imagen

        const nombreArchivo =
            libro.portada.split('/').pop();

        await supabase.storage
            .from('portadas')
            .remove([nombreArchivo]);

        // 2. Borrar registro

        const { error } = await supabase
            .from("libros")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }

        window.location.href = "leidos.html";

      } catch (err) {

          console.error(err);
          alert("Error al borrar el libro");

      }
    });
  });

  function formatearFecha(fecha) {
    if (!fecha) return "";

    const d = new Date(fecha);

    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const anio = d.getFullYear();

    return `${dia}-${mes}-${anio}`;
  }

});
