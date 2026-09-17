import { integer, pgEnum, pgTable, serial, text, timestamp, varchar, unique } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "student", "teacher"]);
export const notificationRecipientEnum = pgEnum("notification_recipient_type", ["all", "students", "specific"]);
export const schoolSectionEnum = pgEnum("school_section", ["primary", "middle"]);
export const assignmentSubmissionStatusEnum = pgEnum("assignment_submission_status", ["submitted", "graded"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["present", "absent", "late", "excused"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  studentId: varchar("studentId", { length: 64 }),
  studentNumber: varchar("studentNumber", { length: 32 }),
  schoolSection: schoolSectionEnum("schoolSection"),
  classLevel: integer("classLevel"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  studentNumberUnique: unique("users_student_number_unique").on(table.studentNumber),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const results = pgTable("results", {
  id: serial("id").primaryKey(),
  studentId: integer("studentId").notNull(),
  schoolSection: schoolSectionEnum("schoolSection"),
  classLevel: integer("classLevel"),
  subject: varchar("subject", { length: 255 }).notNull(),
  grade: varchar("grade", { length: 10 }).notNull(),
  score: integer("score"),
  semester: varchar("semester", { length: 50 }).notNull(),
  academicYear: varchar("academicYear", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Result = typeof results.$inferSelect;
export type InsertResult = typeof results.$inferInsert;

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  grade: varchar("grade", { length: 50 }).notNull(),
  schoolSection: schoolSectionEnum("schoolSection"),
  classLevel: integer("classLevel"),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  uploadedBy: integer("uploadedBy").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Book = typeof books.$inferSelect;
export type InsertBook = typeof books.$inferInsert;

export const calendarEvents = pgTable("calendarEvents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  eventType: varchar("eventType", { length: 50 }).notNull(),
  schoolSection: schoolSectionEnum("schoolSection"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  recipientType: notificationRecipientEnum("recipientType").notNull(),
  recipientIds: text("recipientIds"),
  schoolSection: schoolSectionEnum("schoolSection"),
  sentBy: integer("sentBy").notNull(),
  isRead: integer("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  subject: varchar("subject", { length: 255 }).notNull(),
  schoolSection: schoolSectionEnum("schoolSection").notNull(),
  classLevel: integer("classLevel").notNull(),
  dueDate: timestamp("dueDate"),
  createdBy: integer("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = typeof assignments.$inferInsert;

export const assignmentSubmissions = pgTable("assignmentSubmissions", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignmentId").notNull(),
  studentId: integer("studentId").notNull(),
  content: text("content").notNull(),
  status: assignmentSubmissionStatusEnum("status").default("submitted").notNull(),
  score: integer("score"),
  feedback: text("feedback"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  gradedAt: timestamp("gradedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  assignmentStudentUnique: unique("assignment_submissions_assignment_student_unique").on(table.assignmentId, table.studentId),
}));

export type AssignmentSubmission = typeof assignmentSubmissions.$inferSelect;
export type InsertAssignmentSubmission = typeof assignmentSubmissions.$inferInsert;

export const attendanceSessions = pgTable("attendanceSessions", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacherId").notNull(),
  schoolSection: schoolSectionEnum("schoolSection").notNull(),
  classLevel: integer("classLevel").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  attendanceDate: timestamp("attendanceDate").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AttendanceSession = typeof attendanceSessions.$inferSelect;
export type InsertAttendanceSession = typeof attendanceSessions.$inferInsert;

export const attendanceRecords = pgTable("attendanceRecords", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  studentId: integer("studentId").notNull(),
  status: attendanceStatusEnum("status").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  sessionStudentUnique: unique("attendance_records_session_student_unique").on(table.sessionId, table.studentId),
}));

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = typeof attendanceRecords.$inferInsert;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("senderId").notNull(),
  recipientId: integer("recipientId").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
