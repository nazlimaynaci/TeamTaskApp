# 📋 Task Manager

A lightweight team task-management app. Started as a personal to-do list and grew into a
manager/worker task-assignment tool: managers group workers into teams, assign tasks with
due dates and priorities, review completed work before it counts as done, and workers can
log progress notes or hand a task off to a teammate mid-flight.

Backend is Spring Boot (Java) with JWT auth over PostgreSQL. Frontend is plain HTML/CSS/JS —
no framework, no build step.

---

## ✨ Features

**Accounts & roles**
- Register/login with JWT auth (1-hour token expiry)
- Two roles: **Manager** and **Worker**
- Manager registration requires an invite code — either the fixed bootstrap code (env var,
  for spinning up a brand-new environment) or a one-time code another manager generated
  in-app (single use, shown once to copy/share)

**Personal tasks** (worker)
- Create, edit, complete, delete; filter by all/active/completed
- Due date + priority (low/medium/high), overdue tasks highlighted
- List or calendar view (month grid, color-coded by priority)

**Teams** (manager)
- Create teams, add/remove workers (workers start unassigned after registering)
- A manager can own multiple teams

**Task assignment & approval**
- Manager assigns a task only to a worker in one of their own teams (enforced server-side)
- Due dates can't be set in the past
- Worker marks a task complete → goes to **pending approval** → manager approves or rejects
  (with an optional reason); rejecting resets it to incomplete

**Task notes & handoff** (worker)
- Log free-text progress notes on an assigned task
- Hand the task off to a teammate (same team only); the full note + handoff history carries
  over to the new owner, and the manager can read it too
- A completed/pending task gets reset on handoff, since the new owner hasn't actually done
  that work yet

**Notifications**
- In-app bell + list for assign / complete / approve / reject / handoff / due-soon events

**Manager dashboard**
- Tabbed layout: Görevler (assign + review), İş Yükü (per-member open-task / pending-approval
  counts), Ekiplerim (team management), Davet Kodları (invite codes)

---

## 🛠 Tech stack

| Layer | Stack |
|---|---|
| Backend | Java 17, Spring Boot 4, Spring Security, Spring Data JPA (Hibernate), Bean Validation |
| Auth | JWT (via `jjwt`), BCrypt password hashing |
| Database | PostgreSQL |
| Frontend | Plain HTML / CSS / JavaScript (no framework or bundler) |
| Calendar view | [FullCalendar](https://fullcalendar.io/) (loaded from CDN) |
| Font | [Manrope](https://fonts.google.com/specimen/Manrope) (Google Fonts) |
| Build / CI | Maven, GitHub Actions (build on push to `main`) |
| Containerization | Docker (multi-stage `Dockerfile` included) |

---

## 📁 Project structure

```
src/main/java/com/nazlim/test2todolist/
├── auth/            # AuthController, AuthService, UserRepository
├── controllers/      # REST controllers (Todo, Team, User, Notification, InviteCode)
├── services/         # business logic
├── repository/        # Spring Data JPA repositories
├── entity/           # JPA entities
├── dto/              # request/response records
├── mapper/           # entity <-> DTO mapping
├── security/          # JWT filter/service, Spring Security config
└── exception/         # centralized error handling

frontend/
├── login.html / register.html / todos.html
├── auth.js / todos.js
└── style.css
```

---

## ▶️ Running it locally

### Prerequisites
- Java 17+
- Maven
- PostgreSQL (a local database, e.g. `todo_db`)
- Node.js (only used to serve the static frontend files during local dev)

### One-click (Windows)
Double-click **`run.bat`** in the project root. It starts PostgreSQL if it isn't already
running, starts the backend, serves the frontend, waits for the backend to be ready, and
opens your browser. Safe to re-run — it skips anything that's already up. (Run it from
**Windows File Explorer**, not from inside an IDE's file tree, which usually opens `.bat`
files for editing instead of executing them.)

### Manual
```bash
# Backend (from the project root) - listens on :8080
mvn spring-boot:run

# Frontend - must be served on exactly :63342 (CORS is locked to that origin)
node serve-frontend.js
```
Then open `http://localhost:63342/login.html`.

### Configuration
All configurable via environment variables (see `application.properties` for defaults):

| Variable | Purpose |
|---|---|
| `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | JWT signing key — **must be changed to a real random value before any real deployment** |
| `MANAGER_INVITE_CODE` | Bootstrap invite code for registering the first-ever manager |
| `CORS_ALLOWED_ORIGINS` | Allowed frontend origin(s) |
| `PORT` | Backend port (defaults to 8080) |
| `REMINDER_CHECK_RATE_MS` | How often the due-date reminder scheduler runs |

---

## 🔌 API overview

All `/api/**` endpoints require `Authorization: Bearer <token>`; `/auth/**` is public.

| Area | Base path | Notes |
|---|---|---|
| Auth | `/auth/register`, `/auth/login` | Registration takes an invite code for MANAGER role |
| Todos | `/api/todos/**` | CRUD, assignment, approval, notes, handoff |
| Teams | `/api/teams/**` | Manager: create/list/manage teams + workload. Worker: `my-team`, `my-teammates` |
| Invite codes | `/api/invite-codes/**` | Manager-only: generate/list one-time codes |
| Users | `/api/users/**` | `me` (own profile), worker lookups for managers |
| Notifications | `/api/notifications/**` | List, mark read |

Swagger UI (if enabled): `http://localhost:8080/swagger-ui/index.html`

---

## 🚧 Known limitations

- Automated test coverage is thin — only the original `TodoServiceImpl` has unit tests; the
  team/handoff/invite-code features have been verified manually (curl) but not covered by
  tests yet.
- The default `JWT_SECRET` fallback has been visible in this repo's git history — a real
  random secret must be set via env var before deploying anywhere real.
- Not yet deployed to a live host (Docker image + CI build exist, ready for that step).

---

## 📄 License

Personal project, not currently under a formal license.
