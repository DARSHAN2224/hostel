# Hostel Management Monorepo Structure

Quick reference: See docs/PROJECT_OVERVIEW.md for the end-to-end architecture, request flow, data models, roles/permissions, and core workflows.

This workspace is split into a Vite-powered React client and a Node.js server. The directories below provide a clean starting point that mirrors common industry conventions and keeps responsibilities separated.

## Client (`client/`)
- `public/` – Static assets served as-is.
- `src/` – Application source code.
  - `assets/` – Reusable media such as images and SVGs.
  - `components/` – Shared, presentation-focused React components.
  - `layouts/` – Page shell components responsible for arranging common UI chrome.
  - `pages/` – Top-level route views wired into the router.
  - `hooks/` – Custom React hooks for encapsulating stateful logic.
  - `context/` – React context providers and related state logic.
  - `services/` – Client-side API wrappers and network calls.
  - `utils/` – Pure utility helpers and formatters.
  - `styles/` – Global style sheets, design tokens, and theme helpers.
  - `constants/` – App-wide constants and configuration values.
  - `types/` – Shared TypeScript definition files or JS doc typedefs.

## Server (`server/`)
- `src/` – Server-side implementation.
  - `config/` – Environment configuration, credentials loading, and feature flags.
  - `db/` – Database connection clients and migration helpers.
  - `controllers/` – Request handlers containing business orchestration.
  - `routes/` – Express (or similar) route definitions.
  - `middlewares/` – Custom middleware for auth, validation, logging, etc.
  - `models/` – Data models, ORM entities, or schema definitions.
  - `services/` – Business logic modules reusable across controllers.
  - `validators/` – Request payload validation schemas.
  - `utils/` – Low-level helpers shared across the server.
- `tests/` – Automated test suites.
  - `unit/` – Fast unit and component-level tests.
  - `integration/` – Slower integration tests hitting multiple layers.

With this scaffolding in place, you can layer routing, state management, database integrations, and test suites without reorganizing later. Update this document as new directories or conventions are introduced.

## Frontend styling with Tailwind CSS

The Vite client ships with Tailwind CSS configured via PostCSS. The global stylesheet (`client/src/index.css`) imports the Tailwind layers, and `tailwind.config.js` scopes the purge paths to the Vite source tree.

Run these commands from the `client/` folder to develop or build:

```powershell
npm install
npm run dev
# or npm run build
```

Utility classes are available immediately in JSX files—no manual `class` name mapping or theme wiring is required.

## Environment configuration (server)

The Express app (`server/src/app.js`) relies on Express’ built-in environment support. The value returned by `app.get('env')` reflects `process.env.NODE_ENV`, defaulting to `development`. Set any runtime variables (for example `NODE_ENV` or `PORT`) directly through your shell or hosting provider—no `dotenv` file is needed.

Start the server from the `server/` directory with:

```powershell
npm install
npm start
```

The default health check lives at `GET /health` and echoes the active environment so you can quickly confirm configuration.
