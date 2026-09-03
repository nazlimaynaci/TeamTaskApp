const BASE_URL = "http://localhost:8080";

let currentId = null;
let currentFilter = "all";

window.onload = function () {
    if (!getToken()) {
        window.location.href = "login.html";
        return;
    }
    showRoleBadge();

    if (getRole() === "MANAGER") {
        document.getElementById("managerAssignPanel").style.display = "block";
        document.getElementById("assignedByMeSection").style.display = "block";
        document.getElementById("personalTaskPanel").style.display = "none";
        document.getElementById("personalTodoSection").style.display = "none";
        loadWorkers();
        loadAssignedByMe();
    } else {
        getTodos();
    }
};

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

    fetch(`${BASE_URL}/api/todos`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
            title: title,
            description: description,
            dueDate: dueDate,
            priority: priority
        })
    })
        .then(res => {
            if (!res.ok) {
                throw new Error("Görev eklenemedi");
            }
            return res.json ? res.json() : null;
        })
        .catch(() => null)
        .finally(() => {
            document.getElementById("title").value = "";
            document.getElementById("description").value = "";
            document.getElementById("dueDate").value = "";
            getTodos();
        });
}

function getTodos() {
    fetch(`${BASE_URL}/api/todos`, {
        headers: {
            Authorization: `Bearer ${getToken()}`
        }
    })
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
                        </div>
                    </div>

                    <div class="todo-actions">
                        <button class="icon-btn" onclick='openModal(${JSON.stringify(todo)})'>✏️</button>
                        <button class="icon-btn" onclick="deleteTodo(${todo.id})">❌</button>
                    </div>
                </div>
                `;
            });
        })
        .catch(err => {
            console.error(err);
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

    return `<span class="priority-badge ${info.cls}">${info.text}</span>`;
}

function loadWorkers() {
    fetch(`${BASE_URL}/api/users/workers`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    })
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById("assigneeSelect");
            select.innerHTML = data
                .map(w => `<option value="${w.id}">${w.fullName} (${w.username})</option>`)
                .join("");
        })
        .catch(err => console.error(err));
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

    fetch(`${BASE_URL}/api/todos/assign`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
            title: title,
            description: description,
            dueDate: dueDate,
            priority: priority,
            assigneeId: Number(assigneeId)
        })
    })
        .then(res => {
            if (!res.ok) throw new Error("Görev atanamadı");
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
    fetch(`${BASE_URL}/api/todos/assigned-by-me`, {
        headers: { Authorization: `Bearer ${getToken()}` }
    })
        .then(res => res.json())
        .then(data => {
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

                    ${todo.approvalStatus === "PENDING" ? `
                    <div class="todo-actions">
                        <button class="icon-btn" onclick="approveTodo(${todo.id})">✅</button>
                        <button class="icon-btn" onclick="rejectTodo(${todo.id})">❌</button>
                    </div>
                    ` : ""}
                </div>
                `;
            });
        })
        .catch(err => console.error(err));
}

function approveTodo(id) {
    fetch(`${BASE_URL}/api/todos/approve/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` }
    })
        .then(res => {
            if (!res.ok) throw new Error("Onaylanamadı");
            return res.json();
        })
        .catch(err => alert(err.message))
        .finally(loadAssignedByMe);
}

function rejectTodo(id) {
    const reason = prompt("Red sebebi (opsiyonel):");

    fetch(`${BASE_URL}/api/todos/reject/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ reason: reason || null })
    })
        .then(res => {
            if (!res.ok) throw new Error("Reddedilemedi");
            return res.json();
        })
        .catch(err => alert(err.message))
        .finally(loadAssignedByMe);
}

function updateCounter(todos) {
    const remaining = todos.filter(t => !t.completed).length;
    document.getElementById("todoCounter").textContent =
        `${remaining} görev kaldı`;
}

function deleteTodo(id) {
    fetch(`${BASE_URL}/api/todos/delete/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${getToken()}`
        }
    })
        .then(() => getTodos());
}

function toggleStatus(todo) {
    fetch(`${BASE_URL}/api/todos/update/${todo.id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
            ...todo,
            completed: !todo.completed
        })
    })
        .then(() => getTodos());
}

function openModal(todo) {
    currentId = todo.id;
    document.getElementById("editTitle").value = todo.title || "";
    document.getElementById("editDesc").value = todo.description || "";
    document.getElementById("editDueDate").value = todo.dueDate || "";
    document.getElementById("editPriority").value = todo.priority || "low";
    document.getElementById("modal").style.display = "block";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

function saveUpdate() {
    fetch(`${BASE_URL}/api/todos`, {
        headers: {
            Authorization: `Bearer ${getToken()}`
        }
    })
        .then(res => res.json())
        .then(data => {
            const currentTodo = data.find(t => t.id === currentId);

            return fetch(`${BASE_URL}/api/todos/update/${currentId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    ...currentTodo,
                    title: document.getElementById("editTitle").value,
                    description: document.getElementById("editDesc").value,
                    dueDate: document.getElementById("editDueDate").value || null,
                    priority: document.getElementById("editPriority").value
                })
            });
        })
        .then(() => {
            closeModal();
            getTodos();
        });
}

function logout() {
    clearAuth();
    window.location.href = "login.html";
}