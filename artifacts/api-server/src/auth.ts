import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { ENV } from "./env.js";

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function getSecret(): Uint8Array {
  if (!ENV.jwtSecret) throw new Error("JWT_SECRET is not configured. Please set the JWT_SECRET or SESSION_SECRET environment variable.");
  return new TextEncoder().encode(ENV.jwtSecret);
}

export async function createSessionToken(userId: number, expiresInMs: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Date.now() + expiresInMs)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<{ userId: number }> {
  const { payload } = await jwtVerify(token, getSecret());
  const userId = parseInt(payload.sub ?? "", 10);
  if (!userId || Number.isNaN(userId)) throw new Error("Invalid token payload");
  return { userId };
}
