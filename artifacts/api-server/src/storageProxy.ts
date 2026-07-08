import type { Express } from "express";
import { ENV } from "./env.js";

export function registerStorageProxy(app: Express) {
  app.get("/api/manus-storage/*path", async (req, res) => {
    const raw = (req.params as Record<string, string | string[]>)["path"];
    const key = Array.isArray(raw) ? raw.join("/") : (raw ?? "");
    if (!key) { res.status(400).send("Missing storage key"); return; }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) { res.status(500).send("Storage proxy not configured"); return; }

    try {
      const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "") + "/");
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl.toString(), {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });
      if (!forgeResp.ok) { res.status(502).send("Storage backend error"); return; }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) { res.status(502).send("Empty signed URL"); return; }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
