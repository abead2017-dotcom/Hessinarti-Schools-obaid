---
name: Mobile authentication boundary
description: Durable security rules for the Hussinarti mobile client and its access to school data
---

The mobile client must use the school's existing accounts rather than creating a parallel identity system. Keep bearer tokens in platform secure storage, return only an allowlisted profile, and use existing server-authorized procedures for school records. Parent-child relationships must be verified by the server for every relevant request.

**Why:** A mobile client is inspectable and cannot be trusted to enforce role or family access. Reusing server checks avoids exposing extra student data or creating inconsistent accounts.

**How to apply:** When adding mobile endpoints or screens, keep credentials and token values out of logs, return the minimum profile fields, and preserve the same server-side authorization boundaries used by the web client.
