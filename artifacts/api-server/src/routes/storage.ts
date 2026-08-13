import { Readable } from "stream";
import { z } from "zod";
import { Router, type IRouter, type Request, type Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage.js";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "../shared/const.js";
import { verifySessionToken } from "../auth.js";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const RequestUploadUrlBody = z.object({
  name: z.string(),
  size: z.number(),
  contentType: z.string(),
});

/** Resolve the JWT session cookie to a user, returns null if unauthenticated */
async function getUserFromReq(req: Request) {
  try {
    const raw = req.headers["cookie"];
    if (!raw) return null;
    const parsed = parseCookieHeader(raw as string);
    const token = parsed[COOKIE_NAME];
    if (!token) return null;
    const { userId } = await verifySessionToken(token);
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * POST /storage/uploads/request-url
 * Requires a valid session. Only allows PDF uploads.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const user = await getUserFromReq(req);
  if (!user) {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }
  if (user.role !== "admin" && user.role !== "teacher") {
    res.status(403).json({ error: "ليس لديك صلاحية رفع الملفات" });
    return;
  }

  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "بيانات الطلب غير صحيحة" });
    return;
  }

  const { contentType } = parsed.data;
  if (contentType !== "application/pdf") {
    res.status(400).json({ error: "يُسمح برفع ملفات PDF فقط" });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    res.json({ uploadURL, objectPath });
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "تعذّر إنشاء رابط الرفع" });
  }
});

/**
 * GET /storage/public-objects/*
 * Unconditionally public — used for static app assets.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) { res.status(404).json({ error: "الملف غير موجود" }); return; }
    const response = await objectStorageService.downloadObject(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else { res.end(); }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "تعذّر تحميل الملف" });
  }
});

/**
 * GET /storage/objects/*
 * Serves uploaded book PDFs — requires authentication.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  const user = await getUserFromReq(req);
  if (!user) { res.status(401).json({ error: "يجب تسجيل الدخول أولاً" }); return; }

  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) {
      Readable.fromWeb(response.body as any).pipe(res);
    } else { res.end(); }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "الملف غير موجود" }); return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "تعذّر تحميل الملف" });
  }
});

export default router;
