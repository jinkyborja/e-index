# E-Index Academic Portal

A Svelte + Vite frontend and Express/Prisma API for the E-Index Administration and Teacher portals.

## Portals

- Administration: dashboard, teachers, students, approvals, audit log, and settings.
- Teacher: dashboard, attendance, students, classes, reports, and settings.
- Authentication, registrations, academic records, attendance, notifications, and preferences are loaded from the API and existing MySQL database. The frontend does not contain seeded users or sample portal records.

## Existing environment and database

The backend reads process environment variables and the existing project-root `.env` and `src/.env` files; it does not print their contents. Keep the existing credentials in place—do not copy or replace them.

The API uses `DATABASE_URL` when configured. Otherwise, it builds the Prisma URL in memory from `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and the optional `DB_SSL` / `DB_SSL_REJECT_UNAUTHORIZED` flags. Prisma CLI commands use that same configuration.

Brevo uses `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and optional `BREVO_SENDER_NAME`. Set `FRONTEND_ORIGINS` to the deployed app origin(s) so emailed reset links point to the correct site. Secrets must remain in backend environment configuration, never frontend code.

The currently configured Aiven database is MySQL 8.4.8. The existing `eindex_*` application tables were found during read-only inspection and contained no user, teacher, student, class, attendance, grade, notification, or audit records at that time. The app does not seed or reset records. Provision real accounts and academic records through HeidiSQL.

### Required additive database updates

Two schema updates are required before password resets, administrator-created teacher accounts, and larger profile photos can be used:

1. Apply `server/prisma/migrations/20261115130000_add_password_reset_tokens/migration.sql` to create the hashed, expiring reset-token table.
2. Apply `server/prisma/migrations/20261115131000_expand_user_photo_storage/migration.sql` to widen the existing profile-photo column without changing its stored values.

Review and back up the database first, then apply those SQL files using HeidiSQL. Do **not** apply the older `20261114170000_add_eindex_tables` draft: the existing `eindex_*` tables are already present. The application never runs migrations automatically.

## Run locally

Requirements: Node.js 22.16.0 and npm.

```bash
npm install
npm run prisma:generate
npm run dev:server
npm run dev
```

Run the API and Vite frontend in separate terminals. Vite proxies `/api` requests to `http://localhost:3001`. The `/api/health` endpoint checks the live database connection.

For production, configure the same DB and Brevo variables in the hosting provider's secret environment settings. Render serves the built `dist/` app and API from one origin; its health check is `/api/health`. Restrict Aiven inbound access to the application host rather than opening MySQL publicly.

## Authentication and data behavior

- Teacher registration creates a pending database account; an administrator must approve it.
- Administrator accounts must be provisioned by an authorized operator. The frontend has no default or sample administrator credentials.
- Login checks the stored bcrypt password, account status, and requested portal role. Sessions use random server-side tokens stored as hashes and HttpOnly cookies.
- Password reset uses single-use, hashed tokens that expire after 30 minutes. Responses do not disclose whether an email is registered, and requests are rate limited.
- Teacher data endpoints restrict records to the signed-in teacher and assigned classes. Administrative endpoints require the administrator role.
- Removing a teacher from the UI deactivates the account and retains its related academic records.
- RFID entry records attendance in MySQL; it does not communicate with RFID hardware.

## Routes

- Administration: `/admin/dashboard`, `/admin/teachers`, `/admin/students`, `/admin/approvals`, `/admin/audit-log`, `/admin/settings`
- Teacher: `/teacher/dashboard`, `/teacher/attendance`, `/teacher/students`, `/teacher/classes`, `/teacher/reports`, `/teacher/settings`
- Authentication: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/forgot-password`, `/api/auth/reset-password`
- Portal data: `/api/data`

## Verification

Run the frontend build and backend unit tests:

```bash
npm run build
npm run test:server
```

The backend tests use isolated fixtures and are not proof of real-account authentication. No real teacher or administrator login can be tested until authorized accounts are provisioned in Aiven. Brevo delivery must also be re-tested after correcting the configured API key.
