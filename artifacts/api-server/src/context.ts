import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "@workspace/db";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "./shared/const.js";
import { verifySessionToken } from "./auth.js";

async function getUserFromRequest(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  let token: string | null = null;

  const rawCookie = req.headers["cookie"];
  if (rawCookie) {
    const parsed = parseCookieHeader(rawCookie as string);
    if (parsed[COOKIE_NAME]) token = parsed[COOKIE_NAME];
  }

  if (!token) {
    const auth = req.headers["authorization"];
    if (typeof auth === "string" && auth.startsWith("Bearer ")) token = auth.slice(7);
  }

  if (!token) return null;

  try {
    const { userId } = await verifySessionToken(token);
    const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return result[0] ?? null;
  } catch {
    return null;
  }
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  const user = await getUserFromRequest(opts.req).catch(() => null);
  return { req: opts.req, res: opts.res, user };
}
