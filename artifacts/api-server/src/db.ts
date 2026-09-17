import {
  db,
  users,
  results,
  books,
  calendarEvents,
  notifications,
  assignments,
  assignmentSubmissions,
  attendanceSessions,
  attendanceRecords,
  messages,
} from "@workspace/db";
import { eq, desc, and, or, isNull, like, ne } from "drizzle-orm";
import type { InsertUser } from "@workspace/db";

export async function upsertUserRecord(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");

  const updateSet: Record<string, unknown> = {};
  if (user.name !== undefined) updateSet.name = user.name ?? null;
  if (user.email !== undefined) updateSet.email = user.email ?? null;
  if (user.loginMethod !== undefined) updateSet.loginMethod = user.loginMethod ?? null;
  if (user.lastSignedIn !== undefined) updateSet.lastSignedIn = user.lastSignedIn;
  else updateSet.lastSignedIn = new Date();
  if (user.role !== undefined) updateSet.role = user.role;

  await db
    .insert(users)
    .values({ ...user, lastSignedIn: user.lastSignedIn ?? new Date() })
    .onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? undefined;
}

// Results
export async function getStudentResults(studentId: number) {
  return db.select().from(results).where(eq(results.studentId, studentId));
}

export async function getAllResults() {
  return db.select().from(results);
}

export async function addResult(result: typeof results.$inferInsert) {
  return db.insert(results).values(result);
}

// Books
export async function getBooks(
  grade?: string,
  subject?: string,
  schoolSection?: "primary" | "middle",
) {
  const filters = [];
  if (grade) filters.push(eq(books.grade, grade));
  if (subject) filters.push(eq(books.subject, subject));
  if (schoolSection) filters.push(or(eq(books.schoolSection, schoolSection), isNull(books.schoolSection)));
  return db
    .select()
    .from(books)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(books.createdAt));
}

export async function addBook(book: typeof books.$inferInsert) {
  return db.insert(books).values(book);
}

// Calendar
export async function getCalendarEvents(schoolSection?: "primary" | "middle") {
  return db
    .select()
    .from(calendarEvents)
    .where(schoolSection
      ? or(eq(calendarEvents.schoolSection, schoolSection), isNull(calendarEvents.schoolSection))
      : undefined)
    .orderBy(calendarEvents.startDate);
}

export async function addCalendarEvent(event: typeof calendarEvents.$inferInsert) {
  return db.insert(calendarEvents).values(event);
}

// Notifications
export async function getNotifications(
  schoolSection?: "primary" | "middle",
  role?: "user" | "admin" | "student" | "teacher",
  userId?: number,
) {
  const filters = [];
  if (schoolSection) {
    filters.push(or(eq(notifications.schoolSection, schoolSection), isNull(notifications.schoolSection)));
  }

  if (role !== "admin" && userId !== undefined) {
    const idText = String(userId);
    const specificForUser = and(
      eq(notifications.recipientType, "specific"),
      or(
        eq(notifications.recipientIds, idText),
        like(notifications.recipientIds, `${idText},%`),
        like(notifications.recipientIds, `%,${idText}`),
        like(notifications.recipientIds, `%,${idText},%`),
      ),
    );
    const audience = role === "student"
      ? or(eq(notifications.recipientType, "all"), eq(notifications.recipientType, "students"), specificForUser)
      : or(eq(notifications.recipientType, "all"), specificForUser);
    filters.push(audience);
  }

  return db
    .select()
    .from(notifications)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(notifications.createdAt));
}

export async function addNotification(notification: typeof notifications.$inferInsert) {
  return db.insert(notifications).values(notification);
}

export async function deleteNotification(id: number) {
  return db.delete(notifications).where(eq(notifications.id, id));
}

// Delete helpers
export async function deleteResult(id: number) {
  return db.delete(results).where(eq(results.id, id));
}

export async function deleteBook(id: number) {
  return db.delete(books).where(eq(books.id, id));
}

export async function deleteCalendarEvent(id: number) {
  return db.delete(calendarEvents).where(eq(calendarEvents.id, id));
}

export async function deleteUser(id: number) {
  return db.delete(users).where(eq(users.id, id));
}

// Assignments
export async function getAssignmentsForUser(input: {
  role: "admin" | "student" | "teacher" | "user";
  userId: number;
  schoolSection?: "primary" | "middle" | null;
  classLevel?: number | null;
}) {
  const filters = [];
  if (input.role === "teacher") {
    filters.push(eq(assignments.createdBy, input.userId));
  } else if (input.role === "student") {
    if (!input.schoolSection || input.classLevel === null || input.classLevel === undefined) return [];
    filters.push(eq(assignments.schoolSection, input.schoolSection), eq(assignments.classLevel, input.classLevel));
  }

  return db.select().from(assignments)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(assignments.createdAt));
}

export async function getAssignmentById(id: number) {
  const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id)).limit(1);
  return assignment;
}

export async function getSubmissionsForAssignment(assignmentId: number) {
  return db.select().from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.assignmentId, assignmentId))
    .orderBy(desc(assignmentSubmissions.submittedAt));
}

export async function getSubmissionsForStudent(studentId: number) {
  return db.select().from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.studentId, studentId))
    .orderBy(desc(assignmentSubmissions.submittedAt));
}

export async function getSubmission(assignmentId: number, studentId: number) {
  const [submission] = await db.select().from(assignmentSubmissions)
    .where(and(
      eq(assignmentSubmissions.assignmentId, assignmentId),
      eq(assignmentSubmissions.studentId, studentId),
    ))
    .limit(1);
  return submission;
}

export async function saveAssignmentSubmission(input: {
  assignmentId: number;
  studentId: number;
  content: string;
}) {
  return db.insert(assignmentSubmissions).values({
    assignmentId: input.assignmentId,
    studentId: input.studentId,
    content: input.content,
    status: "submitted",
    submittedAt: new Date(),
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [assignmentSubmissions.assignmentId, assignmentSubmissions.studentId],
    set: {
      content: input.content,
      status: "submitted",
      submittedAt: new Date(),
      score: null,
      feedback: null,
      gradedAt: null,
      updatedAt: new Date(),
    },
  }).returning();
}

export async function gradeAssignmentSubmission(input: {
  submissionId: number;
  score: number;
  feedback?: string;
}) {
  return db.update(assignmentSubmissions).set({
    score: input.score,
    feedback: input.feedback ?? null,
    status: "graded",
    gradedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(assignmentSubmissions.id, input.submissionId)).returning();
}

// Attendance
export async function getStudentsByClass(
  schoolSection: "primary" | "middle",
  classLevel: number,
) {
  return db.select({
    id: users.id,
    name: users.name,
    studentNumber: users.studentNumber,
    schoolSection: users.schoolSection,
    classLevel: users.classLevel,
  }).from(users).where(and(
    eq(users.role, "student"),
    eq(users.schoolSection, schoolSection),
    eq(users.classLevel, classLevel),
  )).orderBy(users.name);
}

export async function createAttendanceSession(input: {
  teacherId: number;
  schoolSection: "primary" | "middle";
  classLevel: number;
  subject: string;
  attendanceDate: Date;
  notes?: string;
  records: Array<{ studentId: number; status: "present" | "absent" | "late" | "excused"; note?: string }>;
}) {
  return db.transaction(async (tx) => {
    const [session] = await tx.insert(attendanceSessions).values({
      teacherId: input.teacherId,
      schoolSection: input.schoolSection,
      classLevel: input.classLevel,
      subject: input.subject,
      attendanceDate: input.attendanceDate,
      notes: input.notes ?? null,
    }).returning();

    if (input.records.length > 0) {
      await tx.insert(attendanceRecords).values(input.records.map((record) => ({
        sessionId: session.id,
        studentId: record.studentId,
        status: record.status,
        note: record.note ?? null,
      })));
    }
    return session;
  });
}

export async function getAttendanceSessionsForTeacher(teacherId: number) {
  return db.select().from(attendanceSessions)
    .where(eq(attendanceSessions.teacherId, teacherId))
    .orderBy(desc(attendanceSessions.attendanceDate));
}

export async function getAttendanceForStudent(studentId: number) {
  return db.select({
    id: attendanceRecords.id,
    status: attendanceRecords.status,
    note: attendanceRecords.note,
    attendanceDate: attendanceSessions.attendanceDate,
    subject: attendanceSessions.subject,
    schoolSection: attendanceSessions.schoolSection,
    classLevel: attendanceSessions.classLevel,
  }).from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .where(eq(attendanceRecords.studentId, studentId))
    .orderBy(desc(attendanceSessions.attendanceDate));
}

// Internal messages
export async function getMessagingUsers(excludeUserId: number) {
  return db.select({
    id: users.id,
    name: users.name,
    role: users.role,
    studentNumber: users.studentNumber,
    schoolSection: users.schoolSection,
    classLevel: users.classLevel,
  }).from(users).where(ne(users.id, excludeUserId)).orderBy(users.name);
}

export async function getMessagesForUser(userId: number) {
  return db.select().from(messages)
    .where(or(eq(messages.senderId, userId), eq(messages.recipientId, userId)))
    .orderBy(desc(messages.createdAt));
}

export async function addMessage(message: typeof messages.$inferInsert) {
  return db.insert(messages).values(message).returning();
}
