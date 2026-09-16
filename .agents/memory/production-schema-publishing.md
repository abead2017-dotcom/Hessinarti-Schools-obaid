---
name: Production schema publishing
description: The Replit-managed production database requires an unpause and Publish flow for schema changes.
---

For this project, production schema changes must go through the Replit Database pane and Publish flow. If either database is paused, unpause Development and Production when the pane offers that action, then publish so Replit can diff the development schema and apply it to production.

**Why:** The agent can verify production with read-only queries, but it cannot safely or supportedly run production DDL; deploying without the publish-time schema step leaves the live application on the old schema.

**How to apply:** Before declaring a production schema repair complete, verify the development schema, confirm production contains the expected objects, check the public health endpoint, and only then report completion.