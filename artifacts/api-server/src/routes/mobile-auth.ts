import { Router, type IRouter } from "express";
import { db, users } from "@workspace/db";
import { eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createSessionToken, hashPassword, verifyPassword, verifySessionToken } from "../auth.js";
import { ONE_YEAR_MS } from "../shared/const.js";

const router: IRouter = Router();

const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

const studentRegistrationSchema = z.object({
  name: z.string().trim().min(2, "الاسم يجب أن يتكون من حرفين على الأقل").max(200),
  email: z.string().trim().email("أدخل بريدًا إلكترونيًا صحيحًا").max(320),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(128),
  schoolSection: z.enum(["primary", "middle"]),
  classLevel: z.number().int(),
});

router.get("/mobile/auth/me", async (req, res, next) => {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ message: "انتهت الجلسة، سجّل الدخول مرة أخرى" });
    return;
  }

  let userId: number;
  try {
    ({ userId } = await verifySessionToken(authorization.slice(7)));
  } catch {
    res.status(401).json({ message: "انتهت الجلسة، سجّل الدخول مرة أخرى" });
    return;
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        studentNumber: users.studentNumber,
        schoolSection: users.schoolSection,
        classLevel: users.classLevel,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      res.status(401).json({ message: "انتهت الجلسة، سجّل الدخول مرة أخرى" });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post("/mobile/auth/register", async (req, res, next) => {
  const parsed = studentRegistrationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "تحقق من بيانات التسجيل" });
    return;
  }

  const { name, password, schoolSection, classLevel } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const maxClass = schoolSection === "primary" ? 6 : 3;
  if (classLevel < 1 || classLevel > maxClass) {
    res.status(400).json({
      message: schoolSection === "primary"
        ? "الصف الأساسي يجب أن يكون من الأول إلى السادس"
        : "الصف المتوسط يجب أن يكون من الأول إلى الثالث",
    });
    return;
  }

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existing) {
      res.status(409).json({ message: "هذا البريد مسجل بالفعل. تواصل مع إدارة المدرسة إذا كان لديك حساب." });
      return;
    }

    const passwordHash = await hashPassword(password);
    await db.insert(users).values({
      openId: `mobile-registration-${crypto.randomUUID()}`,
      name,
      email,
      password: passwordHash,
      loginMethod: "email",
      // New registrations remain unprivileged until school administration approves them.
      role: "user",
      schoolSection,
      classLevel,
    });

    res.status(201).json({
      message: "تم إرسال طلب التسجيل. حسابك بانتظار مراجعة إدارة المدرسة وتفعيله.",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/mobile/auth/login", async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "أدخل المعرّف وكلمة المرور" });
    return;
  }

  try {
    const parsedId = /^\d+$/.test(parsed.data.identifier)
      ? Number(parsed.data.identifier)
      : null;
    const numericId =
      parsedId !== null &&
      Number.isSafeInteger(parsedId) &&
      parsedId > 0 &&
      parsedId <= 2147483647
        ? parsedId
        : null;

    const [user] = await db
      .select()
      .from(users)
      .where(
        numericId !== null
          ? or(
              eq(users.id, numericId),
              eq(users.studentNumber, parsed.data.identifier),
            )
          : eq(users.studentNumber, parsed.data.identifier),
      )
      .limit(1);

    if (!user?.password || !(await verifyPassword(parsed.data.password, user.password))) {
      res.status(401).json({ message: "المعرّف أو كلمة المرور غير صحيحة" });
      return;
    }

    const token = await createSessionToken(user.id, ONE_YEAR_MS);
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        studentNumber: user.studentNumber,
        schoolSection: user.schoolSection,
        classLevel: user.classLevel,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
