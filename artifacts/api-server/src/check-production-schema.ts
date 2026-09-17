import { assertDatabaseSchema, pool } from "@workspace/db";

if (process.env.NODE_ENV !== "production") {
  throw new Error(
    "The production schema check must run with NODE_ENV=production.",
  );
}

try {
  await assertDatabaseSchema(pool);
  console.log(
    "[schema-check] Production database is reachable and matches the application schema. The users table and its required columns are present.",
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[schema-check] FAILED: ${message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}