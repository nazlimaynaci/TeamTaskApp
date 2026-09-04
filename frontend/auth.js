// Yerelde çalışırken localhost:8080'e, canlıda (Render'a deploy edilince) gerçek backend
// adresine gider - sayfanın kendisi hangi adresten açıldıysa ona göre otomatik seçiliyor.
const BASE_URL = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8080"
    : "https://nazlim-task-manager-api.onrender.com";

function selectRole(role) {
    document.getElementById("role").value = role;
    document.querySelectorAll(".filter-tab[data-role]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.role === role);
    });

    const isManager = role === "MANAGER";
    document.getElementById("managerFields").style.display = isManager ? "block" : "none";
    document.getElementById("phoneLabel").textContent = isManager ? "Telefon (zorunlu)" : "Telefon (opsiyonel)";
}

function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const role = document.getElementById("role").value;
    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const company = document.getElementById("company").value;
    const position = document.getElementById("position").value;
    const inviteCode = document.getElementById("inviteCode").value;
    const acceptedTerms = document.getElementById("acceptedTerms").checked;

    if (password !== confirmPassword) {
        alert("Şifreler eşleşmiyor.");
        return;
    }

    if (!acceptedTerms) {
        alert("Kullanım şartlarını kabul etmelisin.");
        return;
    }

    fetch(`${BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username,
            password: password,
            role: role,
            fullName: fullName,
            email: email,
            phone: phone,
            company: company,
            position: position,
            inviteCode: inviteCode,
            acceptedTerms: acceptedTerms
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
    const rememberMe = document.getElementById("rememberMe").checked;

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

            // "Beni hatırla" işaretliyse tarayıcı kapansa da token kalıcı olsun diye localStorage,
            // değilse sekme/tarayıcı kapanınca silinsin diye sessionStorage kullanılır.
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem("token", data.token);
            storage.setItem("role", data.role);

            window.location.href = "todos.html";
        })
        .catch(err => console.error(err));
}