# Vivardhaa – Guntur Mirchi Operations

Internal operations app for managing mirchi purchases, destemming, raasi (sun drying), and outward orders.

---

## Prerequisites

Make sure the following are installed on your machine before you start:

| Tool | Version | Download |
|------|---------|----------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | docker.com |
| [Node.js](https://nodejs.org/) | 18 or higher | nodejs.org |
| [Git](https://git-scm.com/) | Any | git-scm.com |

---

## Quick Start (Docker — recommended)

This is the easiest way to get everything running: the database, API, and web app all start with a single command.

**1. Clone the repository**

```bash
git clone https://github.com/flavica/guntur-mirchi.git
cd guntur-mirchi
```

**2. Start all services**

```bash
docker compose up --build
```

This starts four containers:
- **postgres** — PostgreSQL 16 database
- **api** — NestJS backend (auto-creates all tables on first boot)
- **web** — React + Vite frontend
- **pgadmin** — Database admin UI

**3. Open the app**

| Service | URL |
|---------|-----|
| Vivardhaa App | http://localhost:5173 |
| API (health check) | http://localhost:3000/api |
| pgAdmin (DB UI) | http://localhost:5050 |

**4. Stop everything**

```bash
docker compose down
```

To also delete the database volume (wipes all data):

```bash
docker compose down -v
```

---

## pgAdmin — Connecting to the Database

1. Open http://localhost:5050
2. Log in: email `admin@vivardhaa.com`, password `admin`
3. Right-click **Servers** → **Register** → **Server**
4. Fill in the **Connection** tab:

| Field | Value |
|-------|-------|
| Host | `postgres` |
| Port | `5432` |
| Database | `vivardhaa_db` |
| Username | `vivardhaa` |
| Password | `vivardhaa_secret` |

---

## Local Development (without Docker)

Use this if you want hot-reload on both the API and the web app while editing code.

### 1. Start the database only

```bash
docker compose up postgres -d
```

### 2. Start the API

```bash
cd vivardhaa-app/api
npm install
npm run start:dev
```

The API will be available at http://localhost:3000/api.

### 3. Start the web app

Open a second terminal:

```bash
cd vivardhaa-app/web
npm install
npm run dev
```

The web app will be available at http://localhost:5173.

> **Note:** In local dev mode the web app proxies `/api` requests to `http://localhost:3000` automatically via Vite. No extra config needed.

---

## Project Structure

```
guntur-mirchi/
├── docker-compose.yml          # Orchestrates all services
└── vivardhaa-app/
    ├── api/                    # NestJS backend
    │   ├── src/
    │   │   ├── purchases/      # Inward purchase module
    │   │   ├── destemming/     # Destemming jobs module
    │   │   ├── raasi/          # Sun-drying (Raasi) module
    │   │   └── orders/         # Outward orders module
    │   └── Dockerfile
    └── web/                    # React + Vite frontend
        ├── src/
        │   ├── features/       # One folder per domain module
        │   ├── components/     # Shared UI components
        │   ├── types/          # Shared TypeScript types
        │   └── lib/            # Utilities and API client
        └── Dockerfile
```

---

## Environment Variables

All env vars are set in `docker-compose.yml` for Docker usage and need no manual setup. For local development the defaults below apply.

### API (`vivardhaa-app/api/.env`)

Create this file if it doesn't exist:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=vivardhaa
DB_PASSWORD=vivardhaa_secret
DB_NAME=vivardhaa_db
PORT=3000
NODE_ENV=development
```

### Web (`vivardhaa-app/web/.env`)

```env
VITE_API_URL=/api
```

---

## Common Commands

```bash
# Rebuild containers after code changes
docker compose up --build

# View logs for a specific service
docker compose logs -f api
docker compose logs -f web

# Access the database via psql
docker exec -it vivardhaa-postgres psql -U vivardhaa -d vivardhaa_db

# List tables in psql
\dt

# Run TypeScript type check (web)
cd vivardhaa-app/web && npm run typecheck
```

---

## Troubleshooting

**Port already in use**
Another process is using 5173, 3000, 5432, or 5050. Either stop that process or change the port mapping in `docker-compose.yml`.

**API can't connect to the database (`ENOTFOUND postgres`)**
The containers aren't on the same network. Run:
```bash
docker compose down && docker compose up --build
```

**Tables not created**
The API uses `synchronize: true` in development — tables are auto-created when the API starts. Check API logs:
```bash
docker compose logs api
```

**Web shows blank / API errors**
Make sure all three containers (postgres, api, web) are running:
```bash
docker compose ps
```
