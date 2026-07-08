---
name: Hussinarti Migration
description: Arabic school management platform migrated from zip to Replit monorepo — architecture decisions, env var requirements, known constraints
---

## Overview
Full-stack Arabic school management app. Frontend: React+Vite+Wouter+tRPC. Backend: Express 5+tRPC+Drizzle+PostgreSQL.

## Env Vars Required for Full Login
- `JWT_SECRET` (or falls back to `SESSION_SECRET`) — JWT signing
- `VITE_APP_ID` — Manus OAuth app ID (public, VITE_ prefix)
- `VITE_OAUTH_PORTAL_URL` — Manus OAuth portal URL (public, VITE_ prefix)
- `OAUTH_SERVER_URL` — Manus OAuth server URL (backend)
- `OWNER_OPEN_ID` — OpenID of the admin/owner (auto-assigns admin role)
- `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` — optional, for file storage (book uploads)

## Key Decisions
- `JWT_SECRET` falls back to `SESSION_SECRET` (already provisioned)
- `updateUserRole` restricted: only "user" → "student"/"teacher" — admin is never self-assignable
- Admin role auto-assigned when `openId === OWNER_OPEN_ID` in sdk.ts
- TypeScript project references removed from api-server tsconfig (incompatible with tsx monorepo); uses `paths` + `include` instead
- `@server/*` path alias in hussinarti tsconfig resolves api-server types for `import type { AppRouter }` (type-only, stripped by Vite at runtime)

## Express 5 Compatibility
- Wildcard routes must use named params: `/*path` not `/*`
- `req.params.path` is `string[]` in Express 5 — use `Array.isArray(raw) ? raw.join("/") : raw`
- CORS: restricted to localhost + *.replit.dev + *.repl.co with credentials:true

**Why:** Express 5 uses path-to-regexp v8 which throws on unnamed wildcards.

## DB Schema
5 tables: users, results, books, calendarEvents, notifications
2 enums: user_role (user/admin/student/teacher), notification_recipient_type (all/students/specific)
