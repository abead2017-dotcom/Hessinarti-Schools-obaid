import { Router, type IRouter } from "express";
import { pool, inspectDatabaseSchema } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    const schema = await inspectDatabaseSchema(pool);
    if (schema.missingTables.length > 0 || schema.missingColumns.length > 0) {
      return res.status(503).json({
        status: "error",
        database: "schema_out_of_date",
      });
    }

    return res.json({ status: "ok", database: "ok" });
  } catch {
    return res.status(503).json({
      status: "error",
      database: "unavailable",
    });
  }
});

export default router;
