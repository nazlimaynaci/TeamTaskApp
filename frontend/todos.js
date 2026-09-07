// Yerelde çalışırken localhost:8080'e, canlıda (Render'a deploy edilince) gerçek backend
// adresine gider - sayfanın kendisi hangi adresten açıldıysa ona göre otomatik seçiliyor.
const BASE_URL = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
    ? "http://localhost:8080"
    : "https://nazlim-task-manager-api.onrender.com";

let currentFilter = "all";

// Görev listesi/takvim geçişi için: hangi bölüm hangi görünüm modunda,
// ve o bölümde şu an render edilmiş bir FullCalendar örneği var mı (varsa toggle'da yeniden çizmeden önce yok edilir).
let personalViewMode = "list";
let assignedViewMode = "list";
const calendarInstances = {};

window.onload = function () {
    if (!getToken()) {
        window.location.href = "login.html";
        return;
    }
    showRoleBadge();
    preventPastDueDates();
    loadMyProfile();

    if (getRole() === "MANAGER") {
        document.getElementById("managerTabs").style.display = "flex";
        document.getElementById("workloadPanel").style.display = "block";
        document.getElementById("teamsPanel").style.display = "block";
        document.getElementById("inviteCodesPanel").style.display = "block";
        document.getElementById("managerAssignPanel").style.display = "block";
        document.getElementById("assignedByMeSection").style.display = "block";
        document.getElementById("personalTaskPanel").style.display = "none";
        document.getElementById("personalTodoSection").style.display = "none";
        document.getElementById("workerNav").style.display = "none";
        loadWorkload();
        loadTeams();
        loadInviteCodes();
        loadAssignedByMe();
        authFetch(`${BASE_URL}/api/todos/assigned-by-me`).then(res => res.json()).then(checkDueToday).catch(err => console.error(err));
    } else {
        getTodos();
        loadMyTeam();
        authFetch(`${BASE_URL}/api/todos`).then(res => res.json()).then(checkDueToday).catch(err => console.error(err));
    }

    loadNotifications();
    setInterval(loadNotifications, 30000);
};

// Sayfa açılır açılmaz, tam olarak bugün teslim tarihi olan (henüz tamamlanmamış)
// görevler varsa bunları bir pop-up ile gösterir - yönetici kendi atadıklarına,
// çalışan kendi görevlerine (kişisel + kendisine atanmış) bakar.
function checkDueToday(tasks) {
    const today = new Date().toISOString().split("T")[0];
    const dueToday = tasks.filter(t => t.dueDate === today && !t.completed);

    if (dueToday.length === 0) return;

    document.getElementById("dueTodayList").innerHTML = dueToday.map(t => `
        <div class="todo-card">
            <div class="todo-content">
                <div class="todo-title">${t.title || ""}</div>
                ${t.description ? `<div class="todo-desc">${t.description}</div>` : ""}
                ${priorityBadge(t)}
                ${t.assigneeUsername ? `<div class="todo-meta"><span class="priority-badge status-progress">🧑‍💻 ${t.assigneeUsername}</span></div>` : ""}
            </div>
        </div>
    `).join("");

    document.getElementById("dueTodayModal").style.display = "block";
}

function closeDueTodayModal() {
    document.getElementById("dueTodayModal").style.display = "none";
}

// "Beni hatırla" işaretliyse token localStorage'da, değilse sessionStorage'da durur;
// ikisine de bakıp hangisinde varsa onu kullanıyoruz.
function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function getRole() {
    return localStorage.getItem("role") || sessionStorage.getItem("role");
}

function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("role");
}

// Token'lı her istek buradan geçer. Token süresi dolduğunda (1 saat, JwtService.java)
// backend 401 ile birlikte bir hata nesnesi döner (dizi değil) - eskiden bunu fark etmeyen
// kodlar (.filter/.map çağrıları) sessizce patlıyordu ve butonlar "hiçbir şey yapmıyormuş" gibi
// görünüyordu. Artık 401 görülür görülmez kullanıcı login sayfasına yönlendiriliyor.
function authFetch(url, options = {}) {
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${getToken()}` };

    return fetch(url, { ...options, headers }).then(res => {
        if (res.status === 401) {
            clearAuth();
            alert("Oturumun sona ermiş, tekrar giriş yapman gerekiyor.");
            window.location.href = "login.html";
            throw new Error("Unauthorized");
        }
        return res;
    });
}

// Salt okunur yıldız gösterimi - bir çalışanın genel KPI'sı (onaylanmış görevlerine
// verilen puanların ortalaması) için kullanılır. rating küsüratlı olabileceğinden
// en yakın tam sayıya yuvarlanarak gösterilir.
function starsHtml(rating) {
    if (rating == null) return "";

    const rounded = Math.round(rating);
    let html = '<div class="todo-meta">';
    for (let i = 1; i <= 5; i++) {
        html += `<span style="font-size:18px">${i <= rounded ? "⭐" : "☆"}</span>`;
    }
    html += "</div>";
    return html;
}

// Yöneticinin, tamamlanıp onaylanmış BİR göreve verdiği puan - tıklanabilir.
// Çalışanın genel KPI'sı bu görev puanlarının ortalamasından hesaplanıyor.
function taskStarsHtml(rating, todoId) {
    let html = '<div class="todo-meta">';
    for (let i = 1; i <= 5; i++) {
        const filled = rating && i <= rating;
        html += `<span onclick="event.stopPropagation(); rateTodo(${todoId}, ${i})" style="cursor:pointer;font-size:18px">${filled ? "⭐" : "☆"}</span>`;
    }
    html += "</div>";
    return html;
}

function rateTodo(todoId, rating) {
    authFetch(`${BASE_URL}/api/todos/${todoId}/rating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating })
    })
        .then(res => {
            if (!res.ok) throw new Error("Puan kaydedilemedi");
        })
        .catch(err => alert(err.message))
        .finally(() => {
            loadTeams();
            if (currentMemberDetail) {
                openMemberDetailModal(currentMemberDetail);
            }
        });
}

function showRoleBadge() {
    const role = getRole();
    const badge = document.getElementById("roleBadge");
    if (role === "MANAGER") {
        badge.textContent = "👔 Yönetici";
        badge.className = "priority-badge priority-high";
    } else {
        badge.textContent = "🧑‍💻 Çalışan";
        badge.className = "priority-badge priority-low";
    }
}

// Giriş yapan kişinin adını ve (varsa) şirket/departman bilgisini hero'da gösterir.
// Yöneticide company kayıt sırasında zorunlu girildiği için hep dolu; çalışan için
// zaten ekip adı ayrıca #teamInfo ile gösteriliyor.
function loadMyProfile() {
    authFetch(`${BASE_URL}/api/users/me`)
        .then(res => res.json())
        .then(data => {
            document.getElementById("userAvatar").textContent = initialsOf(data.fullName);

            const el = document.getElementById("profileInfo");
            let text = data.fullName || "";
            if (data.company) {
                text += ` · 🏢 ${data.company}`;
            }
            el.textContent = text;
            el.style.display = "block";

            if (data.role === "WORKER" && data.avgRating != null) {
                const ratingEl = document.getElementById("myRating");
                ratingEl.innerHTML = starsHtml(data.avgRating);
                ratingEl.style.display = "block";
            }
        })
        .catch(err => console.error(err));
}

// Sidebar'daki avatar dairesine koymak için ad-soyaddan baş harfleri çıkarır
// ("nazlım aynacı" -> "NA"). İsim yoksa/tek kelimeyse elden geldiğince baş harf üretir.
function initialsOf(fullName) {
    if (!fullName) return "?";
    const parts = fullName.trim().split(/\s+/);
    const initials = parts.slice(0, 2).map(p => p[0]).join("");
    return initials.toUpperCase();
}

// Sadece çalışan rolündeki kullanıcı için: üye olduğu TÜM ekipleri ve her birinin
// yöneticisini gösterir (bir çalışan artık birden fazla ekipte olabilir). Hiç ekibi
// yoksa kutuyu gizler.
function loadMyTeam() {
    authFetch(`${BASE_URL}/api/teams/my-teams`)
        .then(res => {
            if (!res.ok) throw new Error("Ekip bilgisi alınamadı");
            return res.json();
        })
        .then(data => {
            const el = document.getElementById("teamInfo");
            if (!data.length) {
                el.style.display = "none";
                return;
            }
            el.innerHTML = data.map(t => `<span class="team-info">🧑‍🤝‍🧑 ${t.teamName} — 👔 Yönetici: ${t.managerFullName}</span>`).join("");
            el.style.display = "flex";
            el.style.flexWrap = "wrap";
            el.style.gap = "8px";
            el.style.justifyContent = "center";
            el.style.marginTop = "14px";
        })
        .catch(err => console.error(err));
}

// Tarih seçicilerin takviminden geçmiş bir güne tıklanamasın diye "min" değeri
// bugüne sabitleniyor. Backend zaten @FutureOrPresent ile bunu kesin olarak reddediyor,
// bu sadece kullanıcı geçmiş bir günü seçmeye çalışmadan önce engelleyen bir UX iyileştirmesi.
function preventPastDueDates() {
    const today = new Date().toISOString().split("T")[0];
    ["dueDate", "assignDueDate", "editDueDate"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.min = today;
    });
}

// Yönetici ekranındaki panelleri (Görevler/İş Yükü/Ekiplerim/Davet Kodları) sekme
// gibi gösterir - hepsi alt alta değil, seçilen sekmenin içeriği görünür, diğerleri gizlenir.
function setManagerTab(tab) {
    document.querySelectorAll(".tab-group").forEach(group => {
        group.style.display = "none";
    });
    document.getElementById(`tabGroup-${tab}`).style.display = "block";

    document.querySelectorAll("#managerTabs .tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tab);
    });
}

function setFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll(".filter-tab").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });

    getTodos();
}

function addTodo() {
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const dueDate = document.getElementById("dueDate").value || null;
    const priority = document.getElementById("priority").value;

    if (!title) {
        alert("Görev başlığı boş olamaz.");
        return;
    }

    authFetch(`${BASE_URL}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: title,
            description: description,
            dueDate: dueDate,
            priority: priority
        })
    })
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.message || "Görev eklenemedi"); });
            }
            return res.json ? res.json() : null;
        })
        .catch(err => alert(err.message))
        .finally(() => {
            document.getElementById("title").value = "";
            document.getElementById("description").value = "";
            document.getElementById("dueDate").value = "";
            getTodos();
        });
}

function getTodos() {
    if (currentFilter === "completed" && personalViewMode === "list") {
        loadMyHistory();
        return;
    }

    authFetch(`${BASE_URL}/api/todos`)
        .then(res => {
            if (!res.ok) {
                throw new Error("Görevler alınamadı");
            }
            return res.json();
        })
        .then(data => {
            updateCounter(data);

            const visible = data.filter(todo => {
                if (currentFilter === "active") return !todo.completed;
                if (currentFilter === "completed") return todo.completed;
                return true;
            });

            if (personalViewMode === "calendar") {
                renderPersonalCalendar(visible);
            } else {
                renderPersonalList(visible);
            }
        })
        .catch(err => {
            console.error(err);
        });
}

function renderPersonalList(visible) {
    const list = document.getElementById("todoList");
    list.innerHTML = "";

    visible.forEach(todo => {
        list.innerHTML += `
        <div class="todo-card">
            <div class="todo-left">
                <input type="checkbox"
                    ${todo.completed ? "checked" : ""}
                    onchange='toggleStatus(${JSON.stringify(todo)})' />

                <div class="todo-content">
                    <div class="todo-title ${todo.completed ? "completed" : ""}">
                        ${todo.title || ""}
                    </div>

                    <div class="todo-desc ${todo.completed ? "completed" : ""}">
                        ${todo.description || ""}
                    </div>

                    ${dueDateBadge(todo)}
                    ${priorityBadge(todo)}
                    ${assignedByBadge(todo)}
                    ${todo.assignedByUsername ? `<div class="todo-meta">${approvalStatusBadge(todo)}</div>` : ""}
                </div>
            </div>

            <div class="todo-actions">
                ${todo.assignedByUsername ? `<button class="icon-btn" onclick='openLogModal(${JSON.stringify(todo)}, true)'>📝</button>` : ""}
                <button class="icon-btn" onclick="deleteTodo(${todo.id})">❌</button>
            </div>
        </div>
        `;
    });
}

function renderPersonalCalendar(todos) {
    renderTodoCalendar("personalCalendar", todos, todo => {
        if (todo.assignedByUsername) openLogModal(todo, true);
    });
}

// "Projelerim" sekmesi: çalışanın kendi tamamladığı görevlerin (kişisel + yönetici
// onaylı) geçmişi, her biri kaç günde bitirildiği bilgisiyle birlikte. Bu alanlar
// sadece bundan sonra tamamlanan görevlerde dolu olacağı için eski kayıtlarda süre "–" gösterilir.
function loadMyHistory() {
    authFetch(`${BASE_URL}/api/todos/history`)
        .then(res => res.json())
        .then(data => renderMyHistory(data))
        .catch(err => console.error(err));
}

function renderMyHistory(history) {
    const list = document.getElementById("todoList");
    list.innerHTML = "";

    if (history.length === 0) {
        list.innerHTML = "<p>Henüz tamamlanmış bir görevin yok.</p>";
        return;
    }

    history.forEach(item => {
        const date = item.completedAt ? new Date(item.completedAt).toLocaleString("tr-TR") : "-";
        const duration = item.durationDays != null ? `${item.durationDays} gün` : "–";

        list.innerHTML += `
        <div class="todo-card">
            <div class="todo-content">
                <div class="todo-title completed">${item.title || ""}</div>
                <div class="todo-meta">
                    <span class="priority-badge status-progress">${item.assignedByName ? `👔 ${item.assignedByName}` : "🙋 Kişisel"}</span>
                    ${priorityBadge(item)}
                    <span class="priority-badge status-approved">⏱️ ${duration}</span>
                    <span class="todo-date">${date}</span>
                </div>
                ${starsHtml(item.performanceRating)}
            </div>
        </div>
        `;
    });
}

function dueDateBadge(todo) {
    if (!todo.dueDate) return "";

    const today = new Date().toISOString().split("T")[0];
    const isOverdue = !todo.completed && todo.dueDate < today;

    const [year, month, day] = todo.dueDate.split("-");
    const formatted = `${day}.${month}.${year}`;

    return `
        <div class="todo-meta">
            <span class="todo-date ${isOverdue ? "overdue" : ""}">
                📅 ${formatted}${isOverdue ? " (süresi geçti)" : ""}
            </span>
        </div>
    `;
}

function priorityBadge(todo) {
    if (!todo.priority) return "";

    const labels = { low: "Düşük", medium: "Orta", high: "Yüksek" };
    const label = labels[todo.priority] || todo.priority;

    return `
        <div class="todo-meta">
            <span class="priority-badge priority-${todo.priority}">${label}</span>
        </div>
    `;
}

function assignedByBadge(todo) {
    if (!todo.assignedByUsername) return "";

    return `
        <div class="todo-meta">
            <span class="priority-badge status-progress">👔 Atayan: ${todo.assignedByUsername}</span>
        </div>
    `;
}

function approvalStatusBadge(todo) {
    const labels = {
        NOT_APPLICABLE: { text: "Devam Ediyor", cls: "status-progress" },
        PENDING: { text: "Onay Bekliyor", cls: "status-pending" },
        APPROVED: { text: "Onaylandı", cls: "status-approved" },
        REJECTED: { text: "Reddedildi", cls: "status-rejected" }
    };
    const info = labels[todo.approvalStatus] || { text: todo.approvalStatus, cls: "status-progress" };
    const reasonText = todo.approvalStatus === "REJECTED" && todo.rejectionReason
        ? `: ${todo.rejectionReason}`
        : "";

    return `<span class="priority-badge ${info.cls}">${info.text}${reasonText}</span>`;
}

// Her ekipte kimde kaç açık (yönetici tarafından atanmış) görev var, kimde kaç tanesi
// onay bekliyor - yöneticinin ekrana girer girmez ekibin durumunu görmesi için.
function loadWorkload() {
    authFetch(`${BASE_URL}/api/teams/mine/workload`)
        .then(res => res.json())
        .then(data => renderWorkload(data))
        .catch(err => console.error(err));
}

function renderWorkload(teamsData) {
    const container = document.getElementById("workloadList");
    container.innerHTML = "";

    if (teamsData.length === 0) {
        container.innerHTML = "<p>Henüz ekip oluşturmadın.</p>";
        return;
    }

    teamsData.forEach(team => {
        const rows = team.members.length
            ? team.members.map(m => {
                const avgLabel = m.avgCompletionDays != null
                    ? `~${Math.round(m.avgCompletionDays)} gün ort.`
                    : "–";
                const activeTasksHtml = m.activeTasks && m.activeTasks.length
                    ? `<div class="todo-list">${m.activeTasks.map(t => `
                        <div class="todo-card">
                            <div class="todo-content">
                                <div class="todo-title">${t.title || ""}</div>
                                ${dueDateBadge(t)}
                                ${priorityBadge(t)}
                            </div>
                        </div>
                    `).join("")}</div>`
                    : "<p>Açık görevi yok.</p>";

                return `
                    <div class="todo-card">
                        <div class="todo-content">
                            <div class="todo-title">🧑‍💻 ${m.fullName}</div>
                            <div class="todo-meta">
                                <span class="priority-badge priority-medium">${m.openTaskCount} açık görev</span>
                                ${m.pendingApprovalCount > 0 ? `<span class="priority-badge status-pending">${m.pendingApprovalCount} onay bekliyor</span>` : ""}
                                <span class="priority-badge status-approved">${m.completedTaskCount} tamamlandı</span>
                                <span class="priority-badge status-progress">${avgLabel}</span>
                            </div>
                            ${activeTasksHtml}
                        </div>
                    </div>
                `;
            }).join("")
            : "<p>Bu ekipte henüz üye yok.</p>";

        container.innerHTML += `
            <div class="todo-card team-card">
                <div class="todo-content">
                    <div class="todo-title">${team.teamName}</div>
                    ${rows}
                </div>
            </div>
        `;
    });
}

// Yöneticinin daha önce ürettiği davet kodlarını (kullanılmış/kullanılmamış) listeler.
function loadInviteCodes() {
    authFetch(`${BASE_URL}/api/invite-codes/mine`)
        .then(res => res.json())
        .then(data => renderInviteCodes(data))
        .catch(err => console.error(err));
}

function renderInviteCodes(codes) {
    const container = document.getElementById("inviteCodesList");
    container.innerHTML = "";

    if (codes.length === 0) {
        container.innerHTML = "<p>Henüz kod üretmedin.</p>";
        return;
    }

    codes.forEach(c => {
        const date = new Date(c.createdAt).toLocaleString("tr-TR");
        const statusBadge = c.used
            ? `<span class="priority-badge status-approved">✅ Kullanıldı${c.usedByFullName ? ": " + c.usedByFullName : ""}</span>`
            : `<span class="priority-badge status-progress">Kullanılmadı</span>`;

        container.innerHTML += `
            <div class="todo-card">
                <div class="todo-content">
                    <div class="todo-title" style="font-family:monospace">${c.code}</div>
                    <div class="todo-meta">
                        ${statusBadge}
                        <span class="todo-date">${date}</span>
                    </div>
                </div>
                ${!c.used ? `<button class="icon-btn" onclick="copyInviteCode('${c.code}')">📋</button>` : ""}
            </div>
        `;
    });
}

// Tek kullanımlık, rastgele bir davet kodu üretir - sabit .env kodunun aksine
// her seferinde farklıdır ve bir kere kullanılınca bir daha işe yaramaz.
function generateInviteCode() {
    authFetch(`${BASE_URL}/api/invite-codes`, { method: "POST" })
        .then(res => {
            if (!res.ok) throw new Error("Kod üretilemedi");
            return res.json();
        })
        .then(data => {
            alert(`Yeni davet kodu: ${data.code}\n\nBu kodu yeni yöneticiyle paylaş - sadece bir kere kullanılabilir.`);
        })
        .catch(err => alert(err.message))
        .finally(loadInviteCodes);
}

function copyInviteCode(code) {
    navigator.clipboard.writeText(code)
        .then(() => alert("Kod kopyalandı: " + code))
        .catch(() => alert(code));
}

// Yöneticinin ekiplerini sunucudan çeker; hem "Ekiplerim" panelini
// hem de görev atama ekranındaki (ekibe göre gruplu) çalışan listesini bu veriyle doldurur.
function loadTeams() {
    authFetch(`${BASE_URL}/api/teams/mine`)
        .then(res => res.json())
        .then(data => {
            renderTeamsPanel(data);
            renderAssigneeSelect(data);
        })
        .catch(err => console.error(err));
}

function renderTeamsPanel(teamsData) {
    const container = document.getElementById("teamsList");
    container.innerHTML = "";

    if (teamsData.length === 0) {
        container.innerHTML = "<p>Henüz ekip oluşturmadın.</p>";
    }

    teamsData.forEach(team => {
        const membersHtml = team.members.length
            ? `<div class="todo-list">${team.members.map(m => `
                <div class="todo-card" onclick="openMemberDetailModal(${m.id})" style="cursor:pointer">
                    <div class="todo-left">
                        <div class="todo-content">
                            <div class="todo-title">🧑‍💻 ${m.fullName}</div>
                            <div class="todo-desc">${m.username}</div>
                            ${starsHtml(m.avgRating)}
                        </div>
                    </div>
                    <div class="todo-actions">
                        <button class="icon-btn" title="Ekipten çıkar" onclick="event.stopPropagation(); removeTeamMember(${team.id}, ${m.id})">🗑️</button>
                    </div>
                </div>
            `).join("")}</div>`
            : "<p>Henüz üye yok</p>";

        container.innerHTML += `
            <div class="todo-card team-card">
                <div class="todo-content">
                    <div class="todo-title">${team.name}</div>
                    ${membersHtml}
                    <div class="task-row">
                        <select id="unassignedSelect-${team.id}" class="soft-input flex-grow"></select>
                        <button class="primary-btn" onclick="addTeamMember(${team.id})">+ Ekle</button>
                        <button class="secondary-btn" onclick="deleteTeam(${team.id})">🗑️ Ekibi Sil</button>
                    </div>
                </div>
            </div>
        `;
    });

    fillUnassignedSelects(teamsData);
}

// Her ekip kartındaki "ekle" dropdown'ını, o ekipte HENÜZ olmayan çalışanlarla
// doldurur - bir çalışan başka bir ekipte (hatta başka bir yöneticide) olsa bile
// burada listelenir, çünkü artık aynı anda birden fazla ekibe üye olabiliyor.
function fillUnassignedSelects(teamsData) {
    teamsData.forEach(team => {
        authFetch(`${BASE_URL}/api/teams/${team.id}/available-workers`)
            .then(res => res.json())
            .then(workers => {
                const select = document.getElementById(`unassignedSelect-${team.id}`);
                if (!select) return;
                select.innerHTML = workers.length
                    ? workers.map(w => `<option value="${w.id}">${w.fullName} (${w.username})</option>`).join("")
                    : `<option value="">Eklenecek çalışan yok</option>`;
            })
            .catch(err => console.error(err));
    });
}

// Görev atama panelindeki select'i ekiplere göre grupluyor (optgroup),
// böylece yönetici görevi hangi ekipten kime atacağını görerek seçiyor.
function renderAssigneeSelect(teamsData) {
    const select = document.getElementById("assigneeSelect");
    const groups = teamsData
        .filter(team => team.members.length > 0)
        .map(team => `
            <optgroup label="${team.name}">
                ${team.members.map(m => `<option value="${m.id}">${m.fullName} (${m.username})</option>`).join("")}
            </optgroup>
        `).join("");

    select.innerHTML = groups || `<option value="">Önce ekip oluşturup üye ekle</option>`;
}

function createTeam() {
    const name = document.getElementById("newTeamName").value.trim();
    if (!name) {
        alert("Ekip adı boş olamaz.");
        return;
    }

    authFetch(`${BASE_URL}/api/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
    })
        .then(res => {
            if (!res.ok) throw new Error("Ekip oluşturulamadı");
            return res.json();
        })
        .catch(err => alert(err.message))
        .finally(() => {
            document.getElementById("newTeamName").value = "";
            loadTeams();
        });
}

function addTeamMember(teamId) {
    const select = document.getElementById(`unassignedSelect-${teamId}`);
    const workerId = select.value;
    if (!workerId) {
        alert("Eklenecek çalışan bulunamadı.");
        return;
    }

    authFetch(`${BASE_URL}/api/teams/${teamId}/members/${workerId}`, { method: "PUT" })
        .then(res => {
            if (!res.ok) throw new Error("Çalışan eklenemedi");
            return res.json();
        })
        .catch(err => alert(err.message))
        .finally(loadTeams);
}

function removeTeamMember(teamId, workerId) {
    authFetch(`${BASE_URL}/api/teams/${teamId}/members/${workerId}`, { method: "DELETE" })
        .then(res => {
            if (!res.ok) throw new Error("Çalışan çıkarılamadı");
            return res.json();
        })
        .catch(err => alert(err.message))
        .finally(loadTeams);
}

function deleteTeam(teamId) {
    if (!confirm("Bu ekibi silmek istediğine emin misin? Üyeler ekipsiz kalacak.")) return;

    authFetch(`${BASE_URL}/api/teams/${teamId}`, { method: "DELETE" })
        .then(res => {
            if (!res.ok) throw new Error("Ekip silinemedi");
        })
        .catch(err => alert(err.message))
        .finally(loadTeams);
}

function assignTodo() {
    const assigneeId = document.getElementById("assigneeSelect").value;
    const title = document.getElementById("assignTitle").value.trim();
    const description = document.getElementById("assignDescription").value.trim();
    const dueDate = document.getElementById("assignDueDate").value || null;
    const priority = document.getElementById("assignPriority").value;

    if (!title) {
        alert("Görev başlığı boş olamaz.");
        return;
    }
    if (!assigneeId) {
        alert("Atanacak çalışan bulunamadı.");
        return;
    }

    authFetch(`${BASE_URL}/api/todos/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: title,
            description: description,
            dueDate: dueDate,
            priority: priority,
            assigneeId: Number(assigneeId)
        })
    })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.message || "Görev atanamadı"); });
            return res.json();
        })
        .catch(err => alert(err.message))
        .finally(() => {
            document.getElementById("assignTitle").value = "";
            document.getElementById("assignDescription").value = "";
            document.getElementById("assignDueDate").value = "";
            loadAssignedByMe();
        });
}

function loadAssignedByMe() {
    authFetch(`${BASE_URL}/api/todos/assigned-by-me`)
        .then(res => res.json())
        .then(data => {
            if (assignedViewMode === "calendar") {
                renderAssignedCalendar(data);
            } else {
                renderAssignedList(data);
            }
        })
        .catch(err => console.error(err));
}

function renderAssignedList(data) {
    const list = document.getElementById("assignedByMeList");
    list.innerHTML = "";

    data.forEach(todo => {
        list.innerHTML += `
        <div class="todo-card">
            <div class="todo-left">
                <div class="todo-content">
                    <div class="todo-title ${todo.completed ? "completed" : ""}">
                        ${todo.title || ""}
                    </div>
                    <div class="todo-desc">${todo.description || ""}</div>

                    <div class="todo-meta">
                        <span class="priority-badge status-progress">🧑‍💻 ${todo.assigneeUsername}</span>
                    </div>
                    ${dueDateBadge(todo)}
                    ${priorityBadge(todo)}
                    <div class="todo-meta">${approvalStatusBadge(todo)}</div>
                </div>
            </div>

            <div class="todo-actions">
                <button class="icon-btn" onclick='openModal(${JSON.stringify(todo)})'>✏️</button>
                <button class="icon-btn" onclick='openLogModal(${JSON.stringify(todo)}, false)'>📝</button>
                ${todo.approvalStatus === "PENDING" ? `
                <button class="icon-btn" onclick="approveTodo(${todo.id})">✅</button>
                <button class="icon-btn" onclick="rejectTodo(${todo.id})">❌</button>
                ` : ""}
            </div>
        </div>
        `;
    });
}

function renderAssignedCalendar(todos) {
    renderTodoCalendar("assignedCalendar", todos, todo => openLogModal(todo, false));
}

// Hem kişisel liste hem de "Atadıklarım" listesi tarafından paylaşılan takvim çizici.
// Son teslim tarihi olan her görevi ayın ilgili gününe bir etiket olarak koyar;
// bir önceki FullCalendar örneği varsa (aynı konteynerde) önce yok edilir, yoksa aya geçişlerde üst üste birikirdi.
function renderTodoCalendar(containerId, todos, onEventClick) {
    if (calendarInstances[containerId]) {
        calendarInstances[containerId].destroy();
    }

    const events = todos
        .filter(t => t.dueDate)
        .map(t => ({
            id: String(t.id),
            title: t.title,
            start: t.dueDate,
            allDay: true,
            classNames: [
                `fc-priority-${t.priority || "none"}`,
                t.completed ? "fc-completed" : ""
            ]
        }));

    const calendar = new FullCalendar.Calendar(document.getElementById(containerId), {
        initialView: "dayGridMonth",
        locale: "tr",
        height: "auto",
        headerToolbar: { left: "prev,next today", center: "title", right: "" },
        events: events,
        eventClick: function (info) {
            const todo = todos.find(t => String(t.id) === info.event.id);
            if (todo) onEventClick(todo);
        }
    });

    calendar.render();
    calendarInstances[containerId] = calendar;
}

function setPersonalView(mode) {
    personalViewMode = mode;

    document.getElementById("todoList").style.display = mode === "list" ? "flex" : "none";
    document.getElementById("personalCalendar").style.display = mode === "calendar" ? "block" : "none";

    document.querySelectorAll("#personalViewToggle .filter-tab").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.view === mode);
    });

    getTodos();
}

function setAssignedView(mode) {
    assignedViewMode = mode;

    document.getElementById("assignedByMeList").style.display = mode === "list" ? "flex" : "none";
    document.getElementById("assignedCalendar").style.display = mode === "calendar" ? "block" : "none";

    document.querySelectorAll("#assignedViewToggle .filter-tab").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.view === mode);
    });

    loadAssignedByMe();
}

function approveTodo(id) {
    authFetch(`${BASE_URL}/api/todos/approve/${id}`, { method: "PUT" })
        .then(res => {
            if (!res.ok) throw new Error("Onaylanamadı");
            return res.json();
        })
        .catch(err => alert(err.message))
        .finally(loadAssignedByMe);
}

function rejectTodo(id) {
    const reason = prompt("Red sebebi (opsiyonel):");

    authFetch(`${BASE_URL}/api/todos/reject/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || null })
    })
        .then(res => {
            if (!res.ok) throw new Error("Reddedilemedi");
            return res.json();
        })
        .catch(err => alert(err.message))
        .finally(loadAssignedByMe);
}

function loadNotifications() {
    authFetch(`${BASE_URL}/api/notifications`)
        .then(res => res.json())
        .then(data => {
            const unreadCount = data.filter(n => !n.read).length;
            const badge = document.getElementById("notifBadge");
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = "flex";
            } else {
                badge.style.display = "none";
            }

            const list = document.getElementById("notifList");
            list.innerHTML = "";

            if (data.length === 0) {
                list.innerHTML = "<p>Henüz bildirim yok.</p>";
                return;
            }

            data.forEach(n => {
                const date = new Date(n.createdAt).toLocaleString("tr-TR");
                list.innerHTML += `
                <div class="todo-card">
                    <div class="todo-content">
                        <div class="todo-title ${n.read ? "" : "unread-notif"}">${n.message}</div>
                        <div class="todo-meta"><span class="todo-date">${date}</span></div>
                    </div>
                    ${!n.read ? `<button class="icon-btn" onclick="markNotificationRead(${n.id})">🗑️</button>` : ""}
                </div>
                `;
            });
        })
        .catch(err => console.error(err));
}

function toggleNotifications() {
    loadNotifications();
    document.getElementById("notifModal").style.display = "block";
}

function closeNotifications() {
    document.getElementById("notifModal").style.display = "none";
}

function markNotificationRead(id) {
    authFetch(`${BASE_URL}/api/notifications/read/${id}`, { method: "PUT" })
        .then(() => loadNotifications());
}

function markAllNotificationsRead() {
    authFetch(`${BASE_URL}/api/notifications/read-all`, { method: "PUT" })
        .then(() => loadNotifications());
}

function updateCounter(todos) {
    const remaining = todos.filter(t => !t.completed).length;
    document.getElementById("todoCounter").textContent =
        `${remaining} görev kaldı`;
}

function deleteTodo(id) {
    authFetch(`${BASE_URL}/api/todos/delete/${id}`, { method: "DELETE" })
        .then(() => getTodos());
}

// Bir listedeki tamamlanmış (ama hala onay bekleyen değil) görevleri toplu siler.
// fetchUrl: hangi listeden okunacağı, reloadFn: silme bitince ekranı yenileyecek fonksiyon.
function deleteCompleted(fetchUrl, reloadFn) {
    authFetch(fetchUrl)
        .then(res => res.json())
        .then(data => {
            const completed = data.filter(t => t.completed);
            const deletable = completed.filter(t => t.approvalStatus !== "PENDING");
            const pendingCount = completed.length - deletable.length;

            if (deletable.length === 0) {
                if (pendingCount > 0) {
                    alert(`${pendingCount} görev tamamlandı ama hâlâ onay bekliyor - onaylanmadan silinemez.`);
                } else {
                    alert("Silinecek tamamlanmış görev yok.");
                }
                return;
            }

            // Sadece bir sayı değil, tam olarak hangi görevlerin (ve kime ait olduğunun)
            // silineceğini önceden gösteriyoruz ki "sil dedim başka şeyler gitti" sürprizi yaşanmasın.
            const preview = deletable.map(t => `• ${t.title} (${t.assigneeUsername})`).join("\n");
            const pendingNote = pendingCount > 0
                ? `\n\n(Ayrıca ${pendingCount} görev onay beklediği için bu listeye dahil edilmedi.)`
                : "";

            if (!confirm(`${deletable.length} tamamlanmış görev silinecek:\n\n${preview}${pendingNote}\n\nEmin misin?`)) {
                return;
            }

            return Promise.all(
                deletable.map(t =>
                    authFetch(`${BASE_URL}/api/todos/delete/${t.id}`, { method: "DELETE" })
                        .then(res => ({ ok: res.ok, status: res.status, title: t.title }))
                )
            ).then(results => {
                const failed = results.filter(r => !r.ok);
                if (failed.length > 0) {
                    alert(
                        `${failed.length} görev silinemedi:\n` +
                        failed.map(f => `• ${f.title} (HTTP ${f.status})`).join("\n")
                    );
                }
                reloadFn();
            });
        })
        .catch(err => console.error(err));
}

function deleteCompletedPersonal() {
    deleteCompleted(`${BASE_URL}/api/todos`, getTodos);
}

function deleteCompletedAssigned() {
    deleteCompleted(`${BASE_URL}/api/todos/assigned-by-me`, loadAssignedByMe);
}

function toggleStatus(todo) {
    authFetch(`${BASE_URL}/api/todos/update/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...todo,
            completed: !todo.completed
        })
    })
        .then(() => getTodos());
}

// Görev detaylarını (başlık/açıklama/tarih/öncelik) düzenlemek artık sadece
// yöneticinin "Atadıklarım" listesinden erişebildiği bir işlem - çalışan sadece
// tamamlandı kutucuğunu işaretleyebiliyor, notlar için 📝'yi kullanıyor.
let currentEditTodo = null;

function openModal(todo) {
    currentEditTodo = todo;
    document.getElementById("editTitle").value = todo.title || "";
    document.getElementById("editDesc").value = todo.description || "";
    document.getElementById("editDueDate").value = todo.dueDate || "";
    document.getElementById("editPriority").value = todo.priority || "low";
    document.getElementById("modal").style.display = "block";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
    currentEditTodo = null;
}

function saveUpdate() {
    authFetch(`${BASE_URL}/api/todos/assigned/${currentEditTodo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: document.getElementById("editTitle").value,
            description: document.getElementById("editDesc").value,
            dueDate: document.getElementById("editDueDate").value || null,
            priority: document.getElementById("editPriority").value
        })
    })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.message || "Görev güncellenemedi"); });
            return res.json();
        })
        .catch(err => alert(err.message))
        .finally(() => {
            closeModal();
            loadAssignedByMe();
        });
}

// Görev üzerinde şu ana kadar düşülen notları ve devir kayıtlarını gösteren modalı açar.
// editable=true ise (görevin şu anki sahibi kendi ekranındaysa) not ekleme/devretme formları da gösterilir;
// yönetici "Atadıklarım" listesinden açtığında sadece okunur.
let currentLogTodo = null;

function openLogModal(todo, editable) {
    currentLogTodo = todo;

    document.getElementById("logNoteForm").style.display = editable ? "block" : "none";

    loadLog();
    if (editable) loadTeammatesForHandoff();

    document.getElementById("logModal").style.display = "block";
}

function closeLogModal() {
    document.getElementById("logModal").style.display = "none";
    currentLogTodo = null;
}

function loadLog() {
    authFetch(`${BASE_URL}/api/todos/${currentLogTodo.id}/log`)
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("logList");

            if (data.length === 0) {
                list.innerHTML = "<p>Henüz bir not veya devir kaydı yok.</p>";
                return;
            }

            list.innerHTML = data.map(entry => {
                const date = new Date(entry.createdAt).toLocaleString("tr-TR");
                const badge = entry.type === "HANDOFF"
                    ? `<span class="priority-badge status-progress">🔁 Devir</span>`
                    : "";

                return `
                    <div class="todo-card">
                        <div class="todo-content">
                            <div class="todo-desc">${entry.content}</div>
                            <div class="todo-meta">
                                <span class="todo-date">${entry.authorFullName} · ${date}</span>
                                ${badge}
                            </div>
                        </div>
                    </div>
                `;
            }).join("");
        })
        .catch(err => console.error(err));
}

function addNote() {
    const content = document.getElementById("noteContent").value.trim();
    if (!content) {
        alert("Not boş olamaz.");
        return;
    }

    authFetch(`${BASE_URL}/api/todos/${currentLogTodo.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
    })
        .then(res => {
            if (!res.ok) throw new Error("Not eklenemedi");
            return res.json();
        })
        .catch(err => alert(err.message))
        .finally(() => {
            document.getElementById("noteContent").value = "";
            loadLog();
        });
}

function loadTeammatesForHandoff() {
    authFetch(`${BASE_URL}/api/teams/my-teammates`)
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById("handoffAssignee");
            select.innerHTML = data.length
                ? data.map(w => `<option value="${w.id}">${w.fullName} (${w.username})</option>`).join("")
                : `<option value="">Ekibinde başka çalışan yok</option>`;
        })
        .catch(err => console.error(err));
}

function handoffTodo() {
    const newAssigneeId = document.getElementById("handoffAssignee").value;
    if (!newAssigneeId) {
        alert("Devredilecek çalışan bulunamadı.");
        return;
    }

    const message = document.getElementById("handoffMessage").value.trim();

    authFetch(`${BASE_URL}/api/todos/${currentLogTodo.id}/handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newAssigneeId: Number(newAssigneeId), message: message || null })
    })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw new Error(err.message || "Görev devredilemedi"); });
            return res.json();
        })
        .catch(err => alert(err.message))
        .finally(() => {
            document.getElementById("handoffMessage").value = "";
            closeLogModal();
            getTodos();
        });
}

// Ekiplerim panelinde bir çalışanın adına tıklayınca açılan detay: profil bilgisi,
// açık görevleri ve (varsa süresiyle) tamamladığı görevlerin geçmişi.
let currentMemberDetail = null;

function openMemberDetailModal(workerId) {
    currentMemberDetail = workerId;
    document.getElementById("memberDetailBody").innerHTML = "<p>Yükleniyor...</p>";
    document.getElementById("memberDetailModal").style.display = "block";

    authFetch(`${BASE_URL}/api/teams/members/${workerId}/detail`)
        .then(res => {
            if (!res.ok) throw new Error("Çalışan detayı alınamadı");
            return res.json();
        })
        .then(data => renderMemberDetail(data))
        .catch(err => {
            document.getElementById("memberDetailBody").innerHTML = `<p>${err.message}</p>`;
        });
}

function closeMemberDetailModal() {
    document.getElementById("memberDetailModal").style.display = "none";
    currentMemberDetail = null;
}

function renderMemberDetail(data) {
    const avgLabel = data.avgCompletionDays != null ? `~${Math.round(data.avgCompletionDays)} gün ort.` : "–";

    const activeTasksHtml = data.activeTasks.length
        ? data.activeTasks.map(t => `
            <div class="todo-card">
                <div class="todo-content">
                    <div class="todo-title">${t.title || ""}</div>
                    ${dueDateBadge(t)}
                    ${priorityBadge(t)}
                </div>
            </div>
        `).join("")
        : "<p>Açık görevi yok.</p>";

    const completedTasksHtml = data.completedTasks.length
        ? data.completedTasks.map(t => {
            const date = t.completedAt ? new Date(t.completedAt).toLocaleString("tr-TR") : "-";
            const duration = t.durationDays != null ? `${t.durationDays} gün` : "–";
            return `
                <div class="todo-card">
                    <div class="todo-content">
                        <div class="todo-title completed">${t.title || ""}</div>
                        <div class="todo-meta">
                            ${priorityBadge(t)}
                            <span class="priority-badge status-approved">⏱️ ${duration}</span>
                            <span class="todo-date">${date}</span>
                        </div>
                        ${taskStarsHtml(t.performanceRating, t.id)}
                    </div>
                </div>
            `;
        }).join("")
        : "<p>Henüz tamamlanmış görevi yok.</p>";

    document.getElementById("memberDetailBody").innerHTML = `
        <div class="todo-meta">
            <span class="priority-badge status-progress">👤 ${data.fullName} (${data.username})</span>
            ${data.position ? `<span class="priority-badge priority-low">${data.position}</span>` : ""}
        </div>
        <div class="todo-meta">
            <span class="priority-badge status-approved">${data.completedTaskCount} tamamlandı</span>
            <span class="priority-badge priority-medium">${avgLabel}</span>
        </div>
        ${starsHtml(data.avgRating)}

        <h4>📋 Aktif Görevler</h4>
        <div class="todo-list">${activeTasksHtml}</div>

        <h4>✅ Tamamlanan Görevler (görevlere puan verebilirsin)</h4>
        <div class="todo-list">${completedTasksHtml}</div>
    `;
}

function logout() {
    clearAuth();
    window.location.href = "login.html";
}
