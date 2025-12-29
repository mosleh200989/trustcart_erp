# Copilot Instructions for TrustCart ERP

## Project Overview
TrustCart ERP is a full-stack ERP and e-commerce platform for organic grocery businesses. It consists of a NestJS backend (TypeScript) and a React frontend, orchestrated with Docker. PostgreSQL and Redis are used for data and caching.

## Architecture & Key Components
- **backend/**: NestJS API, organized by modules (user, CRM, product, sales, HR, etc.).
- **frontend/**: React app, uses Redux/Zustand for state, Tailwind CSS for styling.
- **docker/**: Dockerfiles and compose for local/dev orchestration.
- **docs/**: Architecture, API, and setup documentation.
- **db/**: SQL scripts for schema and migrations.

## Developer Workflows
- **Backend**: `cd backend && npm install && npm run build && npm start`
- **Frontend**: `cd frontend && npm install && npm start`
- **Docker (full stack)**: `docker-compose up`
- **Environment**: Copy `.env.example` to `.env` and fill in secrets.

## Conventions & Patterns
- **Backend**: Follows NestJS module/service/controller pattern. Use DTOs for validation. Prefer Prisma/TypeORM for DB access.
- **Frontend**: Use functional components, hooks, and Redux/Zustand for state. Tailwind for all styling.
- **API**: RESTful endpoints, some GraphQL support. See `docs/` for details.
- **Migrations**: SQL scripts in `backend/` and `db/`.
- **Docs**: All major flows and APIs are documented in `docs/`.

## Integration & Communication
- **API**: Frontend communicates with backend via REST (default) or GraphQL (optional).
- **Database**: PostgreSQL, migrations via scripts or ORM.
- **Cache**: Redis for sessions/caching.
- **Docker**: Used for local/dev orchestration, not required for prod.

## Project-Specific Notes
- **Module boundaries** are strict: keep business logic in the appropriate module/service.
- **Env config**: Never commit secrets; always use `.env` (see `.env.example`).
- **Testing**: (If present) Use Jest for backend, React Testing Library for frontend.
- **Scripts**: See `backend/` and `db/` for migration/data scripts.

## Examples
- To add a new backend feature: create a new module in `backend/`, add service/controller, update docs.
- To add a frontend page: create a new component in `frontend/`, connect to API, style with Tailwind.

## References
- See `README.md` for high-level overview.
- See `docs/` for detailed guides and API references.
- See `backend/` and `frontend/` for code structure examples.

---
For any unclear patterns or missing documentation, check the `docs/` folder or contact the dev team.
