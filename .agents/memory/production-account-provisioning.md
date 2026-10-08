---
name: Production account provisioning
description: Distinguish production accounts from development fixtures when debugging login failures
---

User records are separate between development and production. Publishing the app or syncing its schema does not automatically move development accounts into production. Both web and mobile authentication depend on the users provisioned in the database used by the live deployment.

**Why:** A shared login failure across the web app and mobile app can be caused by an empty production users table even when development accounts exist.

**How to apply:** For production login failures, first verify production account presence using aggregate/read-only checks. Do not copy user records or password hashes into production without explicit authorization; prefer the intended, controlled account-provisioning flow.
