import { supabase } from './config.js';
import { exigirSesion, cerrarSesion } from './sesion.js';

document.addEventListener("DOMContentLoaded", async () => {

  const session = await exigirSesion();
  if (!session) return;
  
  // ✅ mostrar usuario  
  const user = session.user;
  document.getElementById("usuarioNombre").textContent = user.email;


  const { data, error } = await supabase
    .from("libros")
    .select("*")
    .eq("email", user.email)
    .order("fin", {
        ascending: false,
        nullsFirst: false
    });

  // ✅ botón logout
  document.getElementById("btnLogout").addEventListener("click", () => cerrarSesion());


  const grid = document.getElementById("gridLibros");

  // ✅ Botón buscar
  document.getElementById("buscar").addEventListener("click", () => {
    window.location.href = "buscar.html";
  });

  document.getElementById("nuevo").addEventListener("click", () => {
    window.location.href = "ficha.html";
    window.location.href = `ficha.html?from=leidos`;
  });

  const inputBusqueda = document.getElementById("busqueda");

  inputBusqueda.addEventListener("input", () => {
    const texto = inputBusqueda.value.toLowerCase();

    const filtrados = data.filter(libro => {

      const titulo = libro.titulo?.toLowerCase() || "";
      const autor = libro.autor?.toLowerCase() || "";
      const nota = libro.nota != null ? libro.nota.toString() : "";

      return (
        titulo.includes(texto) ||
        autor.includes(texto) ||
        nota.includes(texto)
      );
    });

    renderizarLibros(filtrados); // 🔥 importante
  });

  function renderizarLibros(data) {
    grid.innerHTML = "";

    const portadaDefault = "https://kijdjantydlyacjvvhkt.supabase.co/storage/v1/object/public/portadas/no-cover.jpg";

    const nombresMes = [
      "Enero", "Febrero", "Marzo", "Abril",
      "Mayo", "Junio", "Julio", "Agosto",
      "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const contadorAnio = {};
    const contadorMes = {};
  
    
    const librosEnLectura = data.filter(libro => !libro.fin);

    if (librosEnLectura.length > 0) {
      const divEnLectura = document.createElement("div");
        divEnLectura.className = "separador-anio";
        divEnLectura.innerHTML = `<span>En lectura</span>`;
        grid.appendChild(divEnLectura);
        librosEnLectura.forEach(libro => {
          // ✅ LIBRO (igual que ahora)
          const col = document.createElement("div");
          col.className = "col-6 col-sm-4 col-md-3 col-xl-2";
          col.innerHTML = `
            <div class="libro-item" data-id="${libro.id}">
              <div class="titulo">
                <span>${libro.titulo}</span>
              </div>
              <div class="libro-portada">
                <img src="${libro.portada || portadaDefault}">
              </div>
            </div>
          `;

            col.querySelector(".libro-item").addEventListener("click", () => {
              window.location.href = `libro.html?id=${libro.id}&from=leidos`;
            });
          grid.appendChild(col);
        });
    }

    data.forEach(libro => {

      if (!libro.fin) return;

      const fecha = new Date(libro.fin);
      const anio = fecha.getFullYear();
      const mes = fecha.getMonth();

      contadorAnio[anio] = (contadorAnio[anio] || 0) + 1;

      const keyMes = `${anio}-${mes}`;
      contadorMes[keyMes] = (contadorMes[keyMes] || 0) + 1;
    });

    let ultimoAnio = null;
    let ultimoMes = null;

    data.forEach(libro => {

      if (!libro.fin) return;

      const fecha = new Date(libro.fin);
      const anio = fecha.getFullYear();
      const mes = fecha.getMonth();

      const keyMes = `${anio}-${mes}`;

      // ✅ AÑO
      if (anio !== ultimoAnio) {

        const totalAnio = contadorAnio[anio];

        const divAnio = document.createElement("div");
        divAnio.className = "separador-anio";
        divAnio.innerHTML = `<span>${anio} (Libros leídos: ${totalAnio})</span>`;
        grid.appendChild(divAnio);

        ultimoAnio = anio;
        ultimoMes = null;
      }

      // ✅ MES
      if (mes !== ultimoMes) {

        const totalMes = contadorMes[keyMes];

        const divMes = document.createElement("div");
        divMes.className = "separador-mes";
        divMes.innerHTML = `<span>${nombresMes[mes]} (Libros leídos: ${totalMes})</span>`;

        grid.appendChild(divMes);

        ultimoMes = mes;
      }

      // ✅ LIBRO (igual que ahora)
      const col = document.createElement("div");
      col.className = "col-6 col-sm-4 col-md-3 col-xl-2";

      col.innerHTML = `
        <div class="libro-item" data-id="${libro.id}">
          <div class="titulo">
            <span>${libro.titulo}</span>
          </div>
          <div class="libro-portada">
            <img src="${libro.portada || portadaDefault}">
          </div>
        </div>
      `;

        col.querySelector(".libro-item").addEventListener("click", () => {
          window.location.href = `libro.html?id=${libro.id}&from=leidos`;
        });
      grid.appendChild(col);
    });

  }

  renderizarLibros(data);

  const btnTop = document.getElementById("btnTop");
  btnTop.style.opacity = "0";
  btnTop.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      btnTop.style.opacity = "1";
      btnTop.style.pointerEvents = "auto";
    } else {
      btnTop.style.opacity = "0";
      btnTop.style.pointerEvents = "none";
    }
  });
  
});

