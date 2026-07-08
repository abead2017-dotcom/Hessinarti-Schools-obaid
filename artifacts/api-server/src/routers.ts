import { COOKIE_NAME } from "./shared/const.js";
import { getSessionCookieOptions } from "./cookies.js";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./trpc.js";
import { z } from "zod";
import {
  getStudentResults,
  getAllResults,
  addResult,
  getBooks,
  addBook,
  getCalendarEvents,
  addCalendarEvent,
  getNotifications,
  addNotification,
} from "./db.js";
import { TRPCError } from "@trpc/server";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const teacherOrAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user!.role !== "admin" && ctx.user!.role !== "teacher") {
    throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون معلماً أو مديراً" });
  }
  return next({ ctx });
});

export const appRouter = router({
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    updateUserRole: protectedProcedure
      .input(z.object({ role: z.enum(["student", "teacher"]) }))
      .mutation(async ({ input, ctx }) => {
        // Only allow users whose role is still "user" (first-time setup) to pick a role.
        // Admin role is assigned only via OWNER_OPEN_ID in sdk.ts — never via this endpoint.
        if (ctx.user!.role !== "user") {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن تغيير الدور بعد تعيينه" });
        }
        await db.update(users).set({ role: input.role }).where(eq(users.id, ctx.user!.id));
        return { ...ctx.user!, role: input.role };
      }),
  }),

  results: router({
    getMyResults: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user!.role !== "student") {
        throw new TRPCError({ code: "FORBIDDEN", message: "فقط الطلاب يمكنهم عرض نتائجهم" });
      }
      return getStudentResults(ctx.user!.id);
    }),
    getAllResults: adminProcedure.query(async () => getAllResults()),
    addResult: adminProcedure
      .input(
        z.object({
          studentId: z.number(),
          subject: z.string(),
          grade: z.string(),
          score: z.number().optional(),
          semester: z.string(),
          academicYear: z.string(),
        }),
      )
      .mutation(async ({ input }) => addResult(input)),
  }),

  books: router({
    getBooks: publicProcedure
      .input(z.object({ grade: z.string().optional(), subject: z.string().optional() }).optional())
      .query(async ({ input }) => getBooks(input?.grade, input?.subject)),
    uploadBook: teacherOrAdminProcedure
      .input(
        z.object({
          title: z.string(),
          subject: z.string(),
          grade: z.string(),
          fileUrl: z.string(),
          fileKey: z.string(),
          description: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        addBook({ ...input, uploadedBy: ctx.user!.id }),
      ),
  }),

  calendar: router({
    getEvents: publicProcedure.query(async () => getCalendarEvents()),
    addEvent: adminProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          startDate: z.date(),
          endDate: z.date().optional(),
          eventType: z.string(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        addCalendarEvent({ ...input, createdBy: ctx.user!.id }),
      ),
  }),

  notifications: router({
    getNotifications: protectedProcedure.query(async () => getNotifications()),
    sendNotification: adminProcedure
      .input(
        z.object({
          title: z.string(),
          message: z.string(),
          recipientType: z.enum(["all", "students", "specific"]),
          recipientIds: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        addNotification({ ...input, sentBy: ctx.user!.id }),
      ),
  }),
});

export type AppRouter = typeof appRouter;
