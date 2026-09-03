const BASE_URL = "http://localhost:8080";

let currentId = null;
let currentFilter = "all";

window.onload = function () {
    if (!getToken()) {
        window.location.href = "login.html";
        return;
    }
    showRoleBadge();
    getTodos();
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