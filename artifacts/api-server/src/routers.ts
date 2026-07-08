import { COOKIE_NAME, ONE_YEAR_MS } from "./shared/const.js";
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
import { hashPassword, verifyPassword, createSessionToken } from "./auth.js";
import { randomUUID } from "crypto";

const teacherOrAdminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user!.role !== "admin" && ctx.user!.role !== "teacher") {
    throw new TRPCError({ code: "FORBIDDEN", message: "يجب أن تكون معلماً أو مديراً" });
  }
  return next({ ctx });
});

export const appRouter = router({
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(2, "الاسم قصير جداً"),
          email: z.string().email("بريد إلكتروني غير صحيح"),
          password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);
        if (existing.length > 0) {
          throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مستخدم بالفعل" });
        }

        const hash = await hashPassword(input.password);

        // First user registered becomes admin automatically
        const anyUser = await db.select({ id: users.id }).from(users).limit(1);
        const role = anyUser.length === 0 ? "admin" : "user";

        const [user] = await db
          .insert(users)
          .values({
            openId: `local-${randomUUID()}`,
            name: input.name,
            email: input.email,
            password: hash,
            loginMethod: "email",
            role,
          })
          .returning();

        const token = await createSessionToken(user.id, ONE_YEAR_MS);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        const { password: _, ...safeUser } = user;
        return safeUser;
      }),

    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("بريد إلكتروني غير صحيح"),
          password: z.string().min(1),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, input.email))
          .limit(1);

        if (!user?.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
          });
        }

        const valid = await verifyPassword(input.password, user.password);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
          });
        }

        const token = await createSessionToken(user.id, ONE_YEAR_MS);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
        const { password: _, ...safeUser } = user;
        return safeUser;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    updateUserRole: protectedProcedure
      .input(z.object({ role: z.enum(["student", "teacher"]) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user!.role !== "user") {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن تغيير الدور بعد تعيينه" });
        }
        await db.update(users).set({ role: input.role }).where(eq(users.id, ctx.user!.id));
        return { ...ctx.user!, role: input.role };
      }),

    changePassword: protectedProcedure
      .input(
        z.object({
          currentPassword: z.string().min(1),
          newPassword: z.string().min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const [user] = await db.select().from(users).where(eq(users.id, ctx.user!.id)).limit(1);
        if (!user?.password) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن تغيير كلمة المرور" });
        const valid = await verifyPassword(input.currentPassword, user.password);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة المرور الحالية غير صحيحة" });
        const hash = await hashPassword(input.newPassword);
        await db.update(users).set({ password: hash }).where(eq(users.id, user.id));
        return { success: true } as const;
      }),
  }),

  admin: router({
    getUsers: adminProcedure.query(async () => {
      const allUsers = await db.select({
        id: users.id, name: users.name, email: users.email,
        role: users.role, loginMethod: users.loginMethod,
        createdAt: users.createdAt, lastSignedIn: users.lastSignedIn,
      }).from(users);
      return allUsers;
    }),

    setUserRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "student", "teacher", "admin"]) }))
      .mutation(async ({ input }) => {
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true } as const;
      }),

    createUser: adminProcedure
      .input(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          password: z.string().min(8),
          role: z.enum(["user", "student", "teacher", "admin"]),
        }),
      )
      .mutation(async ({ input }) => {
        const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
        if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مستخدم بالفعل" });
        const hash = await hashPassword(input.password);
        const [user] = await db.insert(users).values({
          openId: `local-${randomUUID()}`,
          name: input.name,
          email: input.email,
          password: hash,
          loginMethod: "email",
          role: input.role,
        }).returning({ id: users.id, name: users.name, email: users.email, role: users.role });
        return user;
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
          fileUrl: z.string().url("رابط غير صحيح"),
          fileKey: z.string(),
          description: z.string().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => addBook({ ...input, uploadedBy: ctx.user!.id })),
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
