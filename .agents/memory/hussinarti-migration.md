---
name: Hussinarti Migration
description: Arabic school management platform migrated from zip to Replit monorepo — Manus OAuth removed, replaced with local email/password auth
---

## Overview
Full-stack Arabic school management app. Frontend: React+Vite+Wouter+tRPC. Backend: Express 5+tRPC+Drizzle+PostgreSQL.

## Auth System (local — NO external OAuth)
- Email + password (bcryptjs) with JWT session tokens (jose)
- Cookie: `app_session_id` (HttpOnly, SameSite=None, Secure)
- JWT secret: `SESSION_SECRET` env var (already provisioned) OR `JWT_SECRET`
- First user to register → auto-assigned `admin` role
- `updateUserRole` (self): only `user` → `student`/`teacher` (no admin self-assign)
- `admin.setUserRole`: admin can change any user's role to anything
- `admin.createUser`: admin creates users directly
- Login uses the numeric user ID for staff/admins and the generated `STU-...` student number for students; email remains account metadata.

## Schema Sync
The Drizzle schema source and the managed databases can drift; verify the live table list before debugging API queries. Apply the development schema with the workspace DB push flow, then use Replit Publish for production.
**Why:** The API once failed with `relation "users" does not exist` even though `users` was present in the source schema.
**How to apply:** Treat missing tables as a schema-sync issue first. Never run production DDL manually; production changes belong to Publish.

## Key Architecture
- tsconfig in api-server uses `paths` + `include` for @workspace/db (no project references — incompatible with tsx)
- `@server/*` alias in hussinarti tsconfig resolves api-server types for `import type { AppRouter }` (type-only, stripped by Vite)
- Express 5 wildcard: `/*path` with `Array.isArray(raw) ? raw.join("/") : raw`
- CORS restricted to localhost + *.replit.dev + *.repl.co with credentials:true

## Manus Removal
Deleted: sdk.ts, oauth.ts, storageProxy.ts, ManusDialog.tsx
Removed env vars: VITE_APP_ID, VITE_OAUTH_PORTAL_URL, OAUTH_SERVER_URL, OWNER_OPEN_ID, BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY, axios package
