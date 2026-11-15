# E-Index Academic Portal

A Svelte + Vite frontend and Express/Prisma API for the E-Index Administration and Teacher portals.

## Portals

- Administration: dashboard, teachers, students, approvals, audit log, and settings.
- Teacher: dashboard, attendance, students, classes, reports, and settings.
- Authentication, registrations, academic records, attendance, notifications, and preferences are loaded from the API and existing MySQL database. The frontend does not contain seeded users or sample portal records.

## Existing environment and database

The backend reads process environment variables and the existing project-root `.env` and `src/.env` files; it does not print their contents. Keep the existing credentials in place—do not copy or replace them.

The API uses `DATABASE_URL` when configured. Otherwise, it builds the Prisma URL in memory from `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. For Aiven, set `DB_SSL=true`; `DB_SSL_REJECT_UNAUTHORIZED=true` verifies the server certificate (recommended). `DB_CONNECT_TIMEOUT_MS` configures the Prisma connection timeout in milliseconds (default `10000`, accepted range `1000`–`120000`). These settings also apply when the API builds the URL from the split `DB_*` values. Prisma CLI commands use the same connection configuration.

### Environment variable checklist

| Variable(s) | Required | Used for |
| --- | --- | --- |
| `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | One complete database configuration is required | MySQL connection; `DATABASE_URL` takes precedence |
| `JWT_SECRET` | Required at startup (minimum 32 characters) | Validated as requested; current authentication uses database-backed sessions and does not use JWT signing |
| `DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`, `DB_CONNECT_TIMEOUT_MS` | Optional; defaults apply | MySQL TLS and connect timeout |
| `NODE_ENV`, `PORT` | Optional; defaults apply | Runtime mode and HTTP listener |
| `CORS_ORIGINS` or `FRONTEND_ORIGINS` | Optional; defaults apply | API origin allowlist; `CORS_ORIGINS` takes precedence |
| `FRONTEND_URL` | Optional | Fallback host for password-reset and registration-decision links |
| `SESSION_TTL_DAYS`, `REMEMBER_SESSION_TTL_DAYS` | Optional; defaults apply | Server-side session lifetime |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | Required only to send password-reset, teacher setup, and registration-decision emails | Brevo transactional email |
| `BREVO_SENDER_NAME` | Optional; defaults to `E-Index` | Brevo sender display name |

At startup, the API reports missing or invalid variable **names only**, then exits if required configuration is absent. `/api/health` returns `200` with `{ "ok": true, "db": true }` when MySQL responds, or `503` with `{ "ok": false, "db": false, "reason": "<safe-code>" }` when it does not. The server logs a sanitized database error code and message, without connection credentials, host, or stack trace.

Brevo uses `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and optional `BREVO_SENDER_NAME`. It sends password-reset messages, teacher setup links, and registration-decision notices. The backend reads the existing `CORS_ORIGINS` setting (comma-separated) for allowed app origins; `FRONTEND_ORIGINS` is supported as a fallback. Include the exact dev origin you browse from (for example, `http://192.168.1.12:5173`) and the deployed app origin(s). `FRONTEND_URL` supplies the fallback origin for email links. Keep secrets in backend environment configuration, never frontend code.

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

Run the API and Vite frontend in separate terminals. Vite proxies `/api` requests to the backend port configured by `PORT` in the existing environment files (default `3001`). The `/api/health` endpoint checks the live database connection.

For production, configure the same DB and Brevo variables in the hosting provider's secret environment settings. Render serves the built `dist/` app and API from one origin; its health check is `/api/health`. Restrict Aiven inbound access to the application host rather than opening MySQL publicly.

## Authentication and data behavior

- The college choices in `shared/teacher-colleges.js` are provisional and have not been independently confirmed for the Guiuan Campus. The database is authoritative: `GET /api/auth/colleges` returns active choices only. Provisional migration rows start inactive; an administrator must confirm the official name and campus assignment, record a confirmation reference, and activate a college before it can be selected. Registration creates a pending teacher account, and an administrator must approve it before the teacher can sign in.
- The additive schema/data proposal is in `server/prisma/migrations/20261115190000_add_colleges/migration.sql`. It is review-only in this change: reconcile the existing live schema and Prisma migration baseline, take a verified backup, then apply and validate it in staging before production. Existing `department` data is retained.
- Registration validates the password confirmation on both the frontend and backend. Duplicate emails are normalized and rejected.
- Administrators review the applicant's name, email, and college. Decisions retain the in-app notification and audit record and also attempt an email notice through Brevo. Existing `department` values remain in API responses during the college-ID transition.
- Administrator accounts must be provisioned by an authorized operator. The frontend has no default or sample administrator credentials.
- Login checks the stored bcrypt password and account status, then uses the stored role to open the appropriate portal. Sessions use random server-side tokens stored as hashes and HttpOnly cookies.
- Password reset uses single-use, hashed tokens that expire after 30 minutes. Responses do not disclose whether an email is registered, and requests are rate limited.
- Teacher data endpoints restrict records to the signed-in teacher and assigned classes. Administrative endpoints require the administrator role.
- Removing a teacher from the UI deactivates the account and retains its related academic records.
- RFID entry records attendance in MySQL; it does not communicate with RFID hardware.

## Routes

- Administration: `/admin/dashboard`, `/admin/teachers`, `/admin/students`, `/admin/approvals`, `/admin/audit-log`, `/admin/settings`
- Teacher: `/teacher/dashboard`, `/teacher/attendance`, `/teacher/students`, `/teacher/classes`, `/teacher/reports`, `/teacher/settings`
- Authentication: `/api/auth/colleges`, `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/forgot-password`, `/api/auth/reset-password`
- Portal data: `/api/data`
- College administration: `POST /api/data/colleges/:id/activate` requires explicit name/campus confirmations and a nonempty reference; `POST /api/data/colleges/:id/deactivate` preserves existing user assignments. Both actions are administrator-only and audited.

## Verification

Run the frontend build and backend unit tests:

```bash
npm run build
npm run test:server
```

The backend tests use isolated fixtures and are not proof of real-account authentication. No real teacher or administrator login can be tested until authorized accounts are provisioned in Aiven. Brevo delivery must also be re-tested after correcting the configured API key.
