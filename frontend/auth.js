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

// Render'ın ücretsiz planı 15 dk trafik almayınca backend'i uyutuyor; uyandığında ilk
// istek "Failed to fetch" ile patlayabiliyor. Burada birkaç kez, aralıklarla tekrar
// denenip kullanıcıya "sunucu uyanıyor" mesajı gösteriliyor.
async function postJson(path, body, btnId) {
    const btn = document.getElementById(btnId);
    const statusEl = document.getElementById("authStatus");
    const originalBtnText = btn ? btn.textContent : "";
    const maxAttempts = 8;
    const delayMs = 4000;

    try {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const res = await fetch(`${BASE_URL}${path}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                return { ok: res.ok, data };
            } catch (err) {
                if (attempt === maxAttempts) {
                    throw err;
                }
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = "Bağlanılıyor...";
                }
                if (statusEl) {
                    statusEl.textContent = attempt === 1
                        ? "Sunucu uykuda olabilir, uyandırılıyor... (biraz sürebilir)"
                        : `Sunucu uyanıyor, tekrar deneniyor... (${attempt}/${maxAttempts})`;
                }
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalBtnText;
        }
        if (statusEl) {
            statusEl.textContent = "";
        }
    }
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

    postJson("/auth/register", {
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
    }, "registerBtn")
        .then(({ ok, data }) => {
            if (!ok) {
                alert(data.message || "Kayıt başarısız.");
                return;
            }
            window.location.href = "login.html";
        })
        .catch(err => {
            console.error(err);
            alert("Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.");
        });
}

function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("rememberMe").checked;

    postJson("/auth/login", {
        username: username,
        password: password
    }, "loginBtn")
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
        .catch(err => {
            console.error(err);
            alert("Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.");
        });
}
