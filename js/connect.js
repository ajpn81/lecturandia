import { supabase } from './config.js';
import { exigirSesion, cerrarSesion } from './sesion.js';

const {
    data: { session }
} = await supabase.auth.getSession();

if (session) {
    window.location.href = "leidos.html";
}

document
    .getElementById("loginForm")
    .addEventListener("submit", login);

async function login(event) {

    event.preventDefault();

    const email =
        document.getElementById("usuario").value.trim();

    const password =
        document.getElementById("password").value;

    const errorBox =
        document.getElementById("login-error");

    errorBox.classList.add("error_login_oculto");

    const { error } =
        await supabase.auth.signInWithPassword({
            email,
            password
        });

    if (error) {

        errorBox.textContent =
            "Usuario o contraseña incorrectos";

        errorBox.classList.remove("error_login_oculto");

        return;
    }

    window.location.href = "leidos.html";
}
