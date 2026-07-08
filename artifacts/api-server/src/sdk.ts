import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "./shared/const.js";
import { ForbiddenError } from "./shared/errors.js";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "@workspace/db";
import { db } from "@workspace/db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ENV } from "./env.js";

// ---- Manus API types ----
type ExchangeTokenRequest = {
  clientId: string;
  grantType: string;
  code: string;
  redirectUri: string;
};
type ExchangeTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};
type GetUserInfoResponse = {
  openId: string;
  name?: string;
  email?: string | null;
  loginMethod?: string;
  platform?: string;
  platforms?: string[];
  registeredPlatforms?: string[];
};
type GetUserInfoWithJwtResponse = {
  openId: string;
  name?: string;
  taskUid?: string;
};

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

const EXCHANGE_TOKEN_PATH = "/webdev.v1.WebDevAuthPublicService/ExchangeToken";
const GET_USER_INFO_PATH = "/webdev.v1.WebDevAuthPublicService/GetUserInfo";
const GET_USER_INFO_WITH_JWT_PATH = "/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt";

class OAuthService {
  constructor(private client: AxiosInstance) {
    if (!ENV.oAuthServerUrl) {
      console.warn("[OAuth] OAUTH_SERVER_URL is not configured.");
    }
  }

  private decodeState(state: string): string {
    return Buffer.from(state, "base64").toString("utf-8");
  }

  async getTokenByCode(code: string, state: string): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };
    const { data } = await this.client.post<ExchangeTokenResponse>(EXCHANGE_TOKEN_PATH, payload);
    return data;
  }

  async getUserInfoByToken(accessToken: string): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(GET_USER_INFO_PATH, { accessToken });
    return data;
  }

  async getUserInfoWithJwt(jwt: string): Promise<GetUserInfoWithJwtResponse> {
    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(GET_USER_INFO_WITH_JWT_PATH, { jwt });
    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({ baseURL: ENV.oAuthServerUrl, timeout: AXIOS_TIMEOUT_MS });

function deriveLoginMethod(platforms: unknown, fallback?: string | null): string | null {
  if (fallback && fallback.length > 0) return fallback;
  if (!Array.isArray(platforms) || platforms.length === 0) return null;
  const set = new Set<string>(platforms.filter((p): p is string => typeof p === "string"));
  if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
  if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
  if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
  if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE")) return "microsoft";
  if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
  const first = Array.from(set)[0];
  return first ? first.toLowerCase() : null;
}

async function upsertUser(data: {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: "user" | "admin" | "student" | "teacher";
  lastSignedIn?: Date;
}): Promise<void> {
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name ?? null;
  if (data.email !== undefined) updateSet.email = data.email ?? null;
  if (data.loginMethod !== undefined) updateSet.loginMethod = data.loginMethod ?? null;
  if (data.role !== undefined) updateSet.role = data.role;
  if (data.lastSignedIn !== undefined) updateSet.lastSignedIn = data.lastSignedIn;
  else updateSet.lastSignedIn = new Date();

  // Auto-assign admin role to owner
  if (!data.role && data.openId === ENV.ownerOpenId) {
    updateSet.role = "admin";
  }

  await db
    .insert(users)
    .values({
      openId: data.openId,
      name: data.name ?? null,
      email: data.email ?? null,
      loginMethod: data.loginMethod ?? null,
      role: (updateSet.role as any) ?? "user",
      lastSignedIn: (updateSet.lastSignedIn as Date) ?? new Date(),
    })
    .onConflictDoUpdate({ target: users.openId, set: updateSet });
}

async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

class SDKServer {
  private readonly oauthService: OAuthService;

  constructor(private client: AxiosInstance = createOAuthHttpClient()) {
    this.oauthService = new OAuthService(this.client);
  }

  async exchangeCodeForToken(code: string, state: string): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    return this.oauthService.getUserInfoByToken(accessToken);
  }

  async createSessionToken(
    openId: string,
    opts: { name: string; expiresInMs: number },
  ): Promise<string> {
    if (!ENV.cookieSecret) throw new Error("JWT secret not configured");
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const payload: SessionPayload = { openId, appId: ENV.appId, name: opts.name };
    return new SignJWT(payload as any)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Date.now() + opts.expiresInMs)
      .sign(secret);
  }

  private async verifySessionToken(token: string): Promise<SessionPayload> {
    if (!ENV.cookieSecret) throw ForbiddenError("JWT secret not configured");
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  }

  private extractTokenFromRequest(req: Request): string | null {
    // 1. Cookie
    const rawCookie = req.headers["cookie"] ?? "";
    if (rawCookie) {
      const parsed = parseCookieHeader(rawCookie as string);
      if (parsed[COOKIE_NAME]) return parsed[COOKIE_NAME];
    }
    // 2. Authorization header (fallback for Safari ITP / WebView)
    const auth = req.headers["authorization"];
    if (auth?.startsWith("Bearer ")) {
      return auth.slice(7);
    }
    return null;
  }

  async authenticateRequest(req: Request): Promise<User | null> {
    const token = this.extractTokenFromRequest(req);
    if (!token) return null;

    let payload: SessionPayload;
    try {
      payload = await this.verifySessionToken(token);
    } catch {
      return null;
    }

    if (!payload.openId) return null;

    const signedInAt = new Date();
    let user = await getUserByOpenId(payload.openId);

    if (!user) {
      // Try to fetch from OAuth server
      try {
        const userInfo = await this.oauthService.getUserInfoByToken(token);
        if (userInfo?.openId) {
          await upsertUser({
            openId: userInfo.openId,
            name: userInfo.name ?? null,
            email: userInfo.email ?? null,
            loginMethod: deriveLoginMethod(userInfo.platforms ?? userInfo.registeredPlatforms, userInfo.loginMethod),
            lastSignedIn: signedInAt,
          });
          user = await getUserByOpenId(userInfo.openId);
        }
      } catch {
        // User not found, return null
        return null;
      }
    }

    if (!user) return null;

    // Update lastSignedIn
    await db.update(users).set({ lastSignedIn: signedInAt }).where(eq(users.openId, user.openId));

    return user;
  }
}

export const sdk = new SDKServer();
export { upsertUser, getUserByOpenId };
