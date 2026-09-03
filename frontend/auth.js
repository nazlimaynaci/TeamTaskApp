const BASE_URL = "http://localhost:8080";

function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                alert(data.message || "Kayıt başarısız.");
                return;
            }
            window.location.href = "login.html";
        })
        .catch(err => console.error(err));
}

function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                alert(data.message || "Giriş başarısız.");
                return;
            }

            // TOKEN KAYDET
            localStorage.setItem("token", data.token);

            window.location.href = "todos.html";
        })
        .catch(err => console.error(err));
}