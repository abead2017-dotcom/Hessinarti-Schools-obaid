import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { logger } from "./lib/logger.js";
import { appRouter } from "./routers.js";
import { createContext } from "./context.js";
import { registerOAuthRoutes } from "./oauth.js";
import { registerStorageProxy } from "./storageProxy.js";
import router from "./routes/index.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);

const TRUSTED_ORIGINS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /\.replit\.dev$/,
  /\.repl\.co$/,
];
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin and server-to-server (no origin header)
      if (!origin) return cb(null, true);
      if (TRUSTED_ORIGINS.some((re) => re.test(origin))) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Storage proxy
registerStorageProxy(app);

// OAuth callback
registerOAuthRoutes(app);

// tRPC
app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext }),
);

// REST routes (health, etc.)
app.use("/api", router);

export default app;
