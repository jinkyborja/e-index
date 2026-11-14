# E-Index University & Teacher Portal UI

A responsive Svelte + Vite frontend based on the supplied E-Index Administration and Teacher Portal design references.

## Included screens

### University Administration
- Dashboard
- Teacher Accounts
- Students
- Pending Approvals
- Audit Log
- Account Settings

### Teacher Portal
- Teacher sign-in and registration
- Dashboard
- Attendance & RFID
- Students
- Classes & Sections
- Reports & Analytics
- Settings

The admin and teacher dashboard views are separated into `src/components/AdminDashboard.svelte` and `src/components/TeacherDashboard.svelte`. `AdminDashboard` receives `userSettings`, `teacherCount`, `studentCount`, `pendingCount`, `approvalRate`, and `onNavigate`; `TeacherDashboard` receives `userSettings`, `classes`, `studentCount`, `attendanceRate`, and `onNavigate`. `App.svelte` supplies data from the shared stores, leaving each dashboard's presentation separate from the data source for a future API integration.

The route table in `src/utils/routes.js` maps those pages to URLs. Navigation and browser history are managed by the Svelte-store-backed History API helper in `src/utils/router.js`; `src/stores/auth.js` restores and validates the current LocalStorage-backed demo session before protected routes render.

## Run locally

Requirements: Node.js 22.16.0 (also pinned for Render in `.node-version`) and npm. The API connects to the existing Aiven MySQL database.

```bash
npm install
```

For the API, copy `.env.example` to `.env` and replace the URL placeholders with the existing Aiven MySQL connection details. Download Aiven's CA certificate to `server/certs/ca.pem`; the example URL uses Prisma's strict TLS validation. URL-encode special characters in the credentials. Do not send credentials in chat or commit `.env`.

```bash
npm run prisma:generate
```

`npm install` also generates the Prisma client. If the error `@prisma/client did not initialize yet` appears, run `npm run prisma:generate` once after installing dependencies.

The backend tests use an in-memory Prisma stub and do not need `.env` or an Aiven connection. If the server reports `DATABASE_URL is missing`, copy `.env.example` to `.env`, replace all placeholders with your Aiven MySQL connection details, and place Aiven's CA certificate at `server/certs/ca.pem`. Never put the database URL in frontend code or share the populated `.env`.

The draft migration is at `server/prisma/migrations/20261114170000_add_eindex_tables/migration.sql`. It adds namespaced `eindex_*` tables only; it contains no `DROP`, `DELETE`, or `ALTER` statements. It has not been run against Aiven. First inspect the existing Aiven schema with `npm run db:inspect` and review the output. This uses Prisma `db pull --print`, so it does not change the database or schema file. Confirm that the proposed table names do not already exist before applying the migration with `npm run db:deploy`. Back up the database first.

Run the API and frontend in separate terminals:

```bash
npm run dev:server
npm run dev
```

Open the Vite URL (normally http://localhost:5173). Vite proxies `/api` requests to the local Express server.

## Deploy to Render

The root `render.yaml` configures one Node web service: Render builds the existing Svelte app, and Express serves both the generated `dist/` files and `/api` from the same origin. This avoids separate frontend/API CORS configuration and does not change the UI.

1. Push the project to a private GitHub repository. Do not commit `.env` or `src/.env`; if either file was ever pushed with credentials, rotate those credentials.
2. In Render, choose **New → Blueprint**, connect the repository, and deploy `render.yaml`.
3. In the Render service's Environment settings, set `DATABASE_URL` to the Aiven MySQL URL. Render does not read your local `.env` file. URL-encode special characters in the username and password. Add Aiven's CA certificate under **Secret Files**, for example at `/etc/secrets/aiven-ca.pem`, and set the URL's `sslcert` parameter to that absolute path with `sslaccept=strict`. Keep the connection string and certificate private.
4. Configure Aiven's allowed inbound sources for the Render service's outbound IP ranges. Do not open MySQL to all addresses.
5. Before creating tables, inspect the existing database in HeidiSQL and confirm that the `eindex_*` table names in the draft migration do not already exist. Back up the database, then apply the reviewed additive SQL using HeidiSQL; do not run it blindly. Render deploys do not run migrations automatically.
6. Wait for the Render health check at `/api/health`, then test the deployed site and authentication. The current frontend still uses its LocalStorage demo login; backend authentication is not yet connected to the login UI.

If Render reports a port scan timeout, open the service's **Logs** and check for a startup error before changing the port. The server binds to `0.0.0.0` and uses Render's injected `PORT`; do not hard-code a different port. Confirm that `DATABASE_URL` is set in Render's Environment settings (Render does not load `src/.env` or your local `.env`).

## Build

```bash
npm run build
npm run preview
```

## Routes and access

The root URL redirects to `/login`. After signing in, use the role-specific routes:

- Administration: `/admin/dashboard`, `/admin/teachers`, `/admin/students`, `/admin/approvals`, `/admin/audit-log`, `/admin/settings`
- Teacher: `/teacher/dashboard`, `/teacher/attendance`, `/teacher/students`, `/teacher/classes`, `/teacher/reports`, `/teacher/settings`

Unauthenticated requests to protected routes go to `/login`. A user with the wrong role is returned to their own dashboard. Sign in with one of the sample accounts:

| Role | Email | Password |
| --- | --- | --- |
| Administration | `admin@gmail.com` | `Admin123!` |
| Teacher | `jinkysuson09@gmail.com` | `Teacher123!` |

Use the account tabs to choose a portal. Teacher sign-up creates a local registration for administration approval. After approval, sign in with the password supplied at registration. The **Administration** and **Teacher Portal** sidebar actions sign out and return to `/login`.

## Backend API

The Express API is in `server/`; the Prisma schema is configured for MySQL. Its proposed logical model covers users, teacher registrations, classes/sections, enrollments, students, attendance, grades, notifications, audit records, and persisted sessions. The initial API includes health, registration, login, logout, and current-session endpoints under `/api`. The draft migration has not been applied and must be checked against the actual Aiven tables before deployment.

Authentication uses bcrypt-hashed passwords and random server-side session tokens stored as hashes in MySQL. The browser receives only an HttpOnly, SameSite cookie. The API validates the request origin, checks account approval on session use, and never accepts a client-supplied role as authorization. `npm run test:server` runs the focused auth tests without needing a running MySQL instance; schema inspection and migration deployment require the configured Aiven connection.

No seed command is configured. Existing records will not be reset or overwritten by this draft migration.

## Notes

- The frontend currently retains its LocalStorage demo data flow while the backend integration is being completed. Do not treat this transitional state as production authentication.
- Backend sessions expire after one day by default or 30 days when **Remember me** is selected.
- RFID attendance is simulated by entering a sample RFID code such as `RFID-0001` or a student ID; it does not connect to RFID hardware.
- CSV exports are generated in the browser. Reports use the sample attendance and grade data saved locally.
- No production authentication, role-security boundary, server database, or external integrations are provided. Do not use real or sensitive information.
