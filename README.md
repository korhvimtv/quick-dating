## Quick Datings – FastAPI + PostgreSQL + React template

**Stack**
- **Backend**: FastAPI, SQLAlchemy, Pydantic, JWT auth
- **DB**: PostgreSQL (via Docker)
- **Frontend**: React + Vite + TypeScript
- **Infra**: Dockerfiles for backend and frontend, `docker-compose.yml` for full stack

### Running with Docker Compose

```bash
docker-compose build
docker-compose up
```

Then open:
- Backend API docs: `http://localhost:8000/docs`
- Frontend app: `http://localhost:3000`

### Implemented features

- **Clean backend architecture** with `core`, `db`, `models`, `schemas`, `repositories`, `services`, and `api` layers.
- **Auth endpoints**
  - `POST /api/auth/signup` – email + password, creates user.
  - `POST /api/auth/login` – returns JWT access token on success.
- **Frontend UI**
  - White + pink themed **Sign up** page (email, password, confirm password).
  - White + pink themed **Login** page (email, password).
  - Both pages wired to backend APIs.

