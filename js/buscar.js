import { supabase } from './config.js';
import { exigirSesion, cerrarSesion } from './sesion.js';

document.addEventListener("DOMContentLoaded", async () => {
  const session = await exigirSesion();
  if (!session) return;

  // ✅ mostrar usuario  
  const user = session.user;
  document.getElementById("usuarioNombre").textContent = user.email;

  // ✅ botón logout
  document.getElementById("btnLogout").addEventListener("click", () => cerrarSesion());

  const params = new URLSearchParams(window.location.search);  
  const from = params.get("from");
  const id = params.get("id");

  // ✅ Volver
  document.getElementById("volver").addEventListener("click", () => {
    if (from === "ficha" && id) {
      window.location.href = `ficha.html?id=${id}`;
    } else {
      window.location.href = "leidos.html";
    }
  });
  if (from === "ficha") {
    document.getElementById("nuevo").style.display = "none";
  }

  // ✅ Nuevo libro manual
  document.getElementById("nuevo").addEventListener("click", () => {
    window.location.href = "ficha.html";
  });

  document.getElementById("btnBuscar").addEventListener("click", buscarLibros);

  function buscarLibros() {
    const texto = document.getElementById("busqueda").value.trim();
    if (!texto) return;

    const contenedor = document.getElementById("resultados");
    contenedor.innerHTML = "<p>Buscando...</p>";

    fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(texto)}`)
      .then(res => res.json())
      .then(data => {

      contenedor.innerHTML = "";

      if (!data.docs || data.docs.length === 0) {
        contenedor.innerHTML = "<p>No hay resultados</p>";
        return;
      }

      data.docs.slice(0, 12).forEach(libro => {
        const titulo = libro.title || "Sin título";
        const autor = libro.author_name 
          ? libro.author_name.join(", ") 
          : "Autor desconocido";

        const portadaDefault = "https://kijdjantydlyacjvvhkt.supabase.co/storage/v1/object/public/portadas/no-cover.jpg";

        const portada = libro.cover_i
          ? `https://covers.openlibrary.org/b/id/${libro.cover_i}-L.jpg`
          : portadaDefault;

        const anio = libro.first_publish_year || "Año desconocido";

        const div = document.createElement("div");
        div.className = "libro";

          div.innerHTML = `
            <img src="${portada}" alt="Portada">  

            <div class="info">    
              <h3>${titulo}</h3>    
              <p class="autor">${autor}</p>    
              <p class="detalles">${anio || ""}</p> 
            </div>
          `;

        div.addEventListener("click", () => {

          const params = new URLSearchParams(window.location.search);
          const from = params.get("from");
          const id = params.get("id");

          if (from === "ficha") {

            const datosCompletar = {
              tituloOriginal: titulo,
              autor: autor,
              portada: portada
            };

            localStorage.setItem("completarFicha", JSON.stringify(datosCompletar));

            // ✅ IMPORTANTE: devolvemos el id
            const url = id ? `ficha.html?id=${id}` : "ficha.html";

            window.location.href = url;

          } else {

            const url = `ficha.html?titulo=${encodeURIComponent(titulo)}&autor=${encodeURIComponent(autor)}&portada=${encodeURIComponent(portada)}`;
            
            window.location.href = url;
          }

        });

        contenedor.appendChild(div);
      });

    })
    .catch(err => {
      console.error(err);
      contenedor.innerHTML = "<p>Error en la búsqueda</p>";
    });
}
});