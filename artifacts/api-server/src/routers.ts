import { COOKIE_NAME, ONE_YEAR_MS } from "./shared/const.js";
import { getSessionCookieOptions } from "./cookies.js";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./trpc.js";
import { z } from "zod";
import {
  getStudentResults,
  getAllResults,
  addResult,
  deleteResult,
  getBooks,
  addBook,
  deleteBook,
  getCalendarEvents,
  addCalendarEvent,
  deleteCalendarEvent,
  getNotifications,
  addNotification,
  deleteNotification,
  deleteUser,
} from "./db.js";
import { TRPCError } from "@trpc/server";
import { db, users, books } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { hashPassword, verifyPassword, createSessionToken } from "./auth.js";
import { randomUUID } from "crypto";

const schoolSectionSchema = z.enum(["primary", "middle"]);

function validateClassLevel(section: "primary" | "middle", classLevel: number) {
  const max = section === "primary" ? 6 : 3;
  if (!Number.isInteger(classLevel) || classLevel < 1 || classLevel > max) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: section === "primary"
        ? "الصف الأساسي يجب أن يكون من الأول إلى السادس"
        : "الصف المتوسط يجب أن يكون من الأول إلى الثالث",
    });
  }
}

function studentNumberForUser(userId: number) {
  return `STU-${String(userId).padStart(6, "0")}`;
}

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
          identifier: z.string().trim().min(1, "أدخل المعرّف (ID)"),
          password: z.string().min(1),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const parsedId = /^\d+$/.test(input.identifier) ? Number(input.identifier) : null;
        const numericId = parsedId !== null && Number.isSafeInteger(parsedId) && parsedId > 0 && parsedId <= 2147483647
          ? parsedId
          : null;
        const [user] = await db
          .select()
          .from(users)
          .where(
            numericId !== null
              ? or(eq(users.id, numericId), eq(users.studentNumber, input.identifier))
              : eq(users.studentNumber, input.identifier),
          )
          .limit(1);

        if (!user?.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "المعرّف أو كلمة المرور غير صحيحة",
          });
        }

        const valid = await verifyPassword(input.password, user.password);
        if (!valid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "المعرّف أو كلمة المرور غير صحيحة",
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
      .input(z.object({
        role: z.enum(["student", "teacher"]),
        schoolSection: schoolSectionSchema.optional(),
        classLevel: z.number().int().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user!.role !== "user") {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكن تغيير الدور بعد تعيينه" });
        }
        if (input.role === "student") {
          if (!input.schoolSection || input.classLevel === undefined) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "اختر القسم والصف الدراسي" });
          }
          validateClassLevel(input.schoolSection, input.classLevel);
        }
        await db.update(users).set({
          role: input.role,
          schoolSection: input.schoolSection ?? null,
          classLevel: input.role === "student" ? input.classLevel ?? null : null,
          studentNumber: input.role === "student" ? studentNumberForUser(ctx.user!.id) : null,
        }).where(eq(users.id, ctx.user!.id));
        return {
          ...ctx.user!,
          role: input.role,
          schoolSection: input.schoolSection ?? null,
          classLevel: input.role === "student" ? input.classLevel ?? null : null,
          studentNumber: input.role === "student" ? studentNumberForUser(ctx.user!.id) : null,
        };
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
        studentNumber: users.studentNumber, schoolSection: users.schoolSection, classLevel: users.classLevel,
        createdAt: users.createdAt, lastSignedIn: users.lastSignedIn,
      }).from(users);
      return allUsers;
    }),

    setUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "student", "teacher", "admin"]),
        schoolSection: schoolSectionSchema.optional(),
        classLevel: z.number().int().optional(),
      }))
      .mutation(async ({ input }) => {
        if (input.role === "student") {
          if (!input.schoolSection || input.classLevel === undefined) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "اختر القسم والصف الدراسي للطالب" });
          }
          validateClassLevel(input.schoolSection, input.classLevel);
        }
        const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
        await db.update(users).set({
          role: input.role,
          schoolSection: input.schoolSection ?? null,
          classLevel: input.role === "student" ? input.classLevel ?? null : null,
          studentNumber: input.role === "student" ? studentNumberForUser(input.userId) : null,
        }).where(eq(users.id, input.userId));
        return { success: true } as const;
      }),

    deleteUser: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (input.userId === ctx.user!.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك حذف حسابك الخاص" });
        }
        await deleteUser(input.userId);
        return { success: true } as const;
      }),

    resetUserPassword: adminProcedure
      .input(z.object({
        userId: z.number(),
        newPassword: z.string().min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"),
      }))
      .mutation(async ({ input }) => {
        const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });

        const hash = await hashPassword(input.newPassword);
        await db.update(users).set({ password: hash }).where(eq(users.id, input.userId));
        return { success: true } as const;
      }),

    createUser: adminProcedure
      .input(
        z.object({
          name: z.string().min(2),
          email: z.string().email(),
          password: z.string().min(8),
          role: z.enum(["user", "student", "teacher", "admin"]),
          schoolSection: schoolSectionSchema.optional(),
          classLevel: z.number().int().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
        if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "البريد الإلكتروني مستخدم بالفعل" });
        if (input.role === "student") {
          if (!input.schoolSection || input.classLevel === undefined) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "اختر القسم والصف الدراسي للطالب" });
          }
          validateClassLevel(input.schoolSection, input.classLevel);
        }
        const hash = await hashPassword(input.password);
        const [user] = await db.insert(users).values({
          openId: `local-${randomUUID()}`,
          name: input.name,
          email: input.email,
          password: hash,
          loginMethod: "email",
          role: input.role,
          schoolSection: input.schoolSection ?? null,
          classLevel: input.role === "student" ? input.classLevel ?? null : null,
        }).returning({ id: users.id, name: users.name, email: users.email, role: users.role });
        if (input.role === "student") {
          await db.update(users)
            .set({ studentNumber: studentNumberForUser(user.id) })
            .where(eq(users.id, user.id));
        }
        return {
          ...user,
          studentNumber: input.role === "student" ? studentNumberForUser(user.id) : null,
        };
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
    deleteResult: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteResult(input.id)),
  }),

  books: router({
    getBooks: publicProcedure
      .input(z.object({
        grade: z.string().optional(),
        subject: z.string().optional(),
        schoolSection: schoolSectionSchema.optional(),
      }).optional())
      .query(async ({ input }) => getBooks(input?.grade, input?.subject, input?.schoolSection)),
    uploadBook: teacherOrAdminProcedure
      .input(
        z.object({
          title: z.string(),
          subject: z.string(),
          grade: z.string(),
          fileUrl: z.string().min(1).refine(
            (value) => value.startsWith("/api/storage/objects/") || /^https?:\/\/.+/.test(value),
            "رابط غير صحيح",
          ),
          fileKey: z.string(),
          description: z.string().optional(),
          schoolSection: schoolSectionSchema.optional(),
          classLevel: z.number().int().optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (input.schoolSection && input.classLevel !== undefined) {
          validateClassLevel(input.schoolSection, input.classLevel);
        }
        return addBook({ ...input, uploadedBy: ctx.user!.id });
      }),
    deleteBook: teacherOrAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Admins can delete any book; teachers can only delete their own uploads
        if (ctx.user!.role !== "admin") {
          const [found] = await db.select({ uploadedBy: books.uploadedBy }).from(books).where(eq(books.id, input.id)).limit(1);
          if (!found) throw new TRPCError({ code: "NOT_FOUND", message: "الكتاب غير موجود" });
          if (found.uploadedBy !== ctx.user!.id) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك حذف كتاب رفعه شخص آخر" });
        }
        return deleteBook(input.id);
      }),
  }),

  calendar: router({
    getEvents: publicProcedure
      .input(z.object({ schoolSection: schoolSectionSchema.optional() }).optional())
      .query(async ({ input }) => getCalendarEvents(input?.schoolSection)),
    addEvent: adminProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          startDate: z.date(),
          endDate: z.date().optional(),
          eventType: z.string(),
          schoolSection: schoolSectionSchema.optional(),
        }),
      )
      .mutation(async ({ input, ctx }) =>
        addCalendarEvent({ ...input, createdBy: ctx.user!.id }),
      ),
    deleteEvent: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteCalendarEvent(input.id)),
  }),

  notifications: router({
    getNotifications: protectedProcedure.query(async ({ ctx }) =>
      getNotifications(ctx.user!.schoolSection ?? undefined, ctx.user!.role, ctx.user!.id),
    ),
    sendNotification: adminProcedure
      .input(
        z.object({
          title: z.string(),
          message: z.string(),
          recipientType: z.enum(["all", "students", "specific"]),
          recipientIds: z.string().optional(),
          schoolSection: schoolSectionSchema.optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        if (input.recipientType === "specific") {
          const ids = (input.recipientIds ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
          if (ids.length === 0 || ids.some((value) => !/^\d+$/.test(value))) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "أدخل أرقام المستخدمين مفصولة بفواصل" });
          }
          return addNotification({ ...input, recipientIds: ids.join(","), sentBy: ctx.user!.id });
        }
        return addNotification({ ...input, recipientIds: undefined, sentBy: ctx.user!.id });
      }),
    deleteNotification: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => deleteNotification(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
