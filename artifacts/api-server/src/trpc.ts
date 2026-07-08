import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "./shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context.js";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const router = t.router;

const errorHandlingMiddleware = t.middleware(async ({ path, type, next }) => {
  const result = await next();
  if (!result.ok) {
    const { error } = result;
    if (error instanceof TRPCError && error.code !== "INTERNAL_SERVER_ERROR") {
      console.warn(`[tRPC] ${type} ${path} -> ${error.code}: ${error.message}`);
    } else {
      console.error(`[tRPC] ${type} ${path} failed:`, error.cause ?? error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى لاحقاً.",
        cause: error,
      });
    }
  }
  return result;
});

export const publicProcedure = t.procedure.use(errorHandlingMiddleware);

const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = publicProcedure.use(requireUser);

export const adminProcedure = publicProcedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
