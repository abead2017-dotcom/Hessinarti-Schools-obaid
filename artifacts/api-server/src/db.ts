import { db, users, results, books, calendarEvents, notifications } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
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
export async function getBooks(grade?: string, subject?: string) {
  if (grade && subject) {
    return db
      .select()
      .from(books)
      .where(and(eq(books.grade, grade), eq(books.subject, subject)))
      .orderBy(desc(books.createdAt));
  }
  if (grade) {
    return db.select().from(books).where(eq(books.grade, grade)).orderBy(desc(books.createdAt));
  }
  if (subject) {
    return db.select().from(books).where(eq(books.subject, subject)).orderBy(desc(books.createdAt));
  }
  return db.select().from(books).orderBy(desc(books.createdAt));
}

export async function addBook(book: typeof books.$inferInsert) {
  return db.insert(books).values(book);
}

// Calendar
export async function getCalendarEvents() {
  return db.select().from(calendarEvents).orderBy(calendarEvents.startDate);
}

export async function addCalendarEvent(event: typeof calendarEvents.$inferInsert) {
  return db.insert(calendarEvents).values(event);
}

// Notifications
export async function getNotifications() {
  return db.select().from(notifications).orderBy(desc(notifications.createdAt));
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
