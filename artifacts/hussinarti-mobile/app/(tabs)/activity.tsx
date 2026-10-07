import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/context/SessionContext";
import {
  AppText,
  Card,
  dateLabel,
  EmptyState,
  Page,
  SectionTitle,
} from "@/components/ui";
import { useColors } from "@/hooks/useColors";

export default function ActivityScreen() {
  const colors = useColors();
  const { user } = useSession();
  const role = user?.role ?? "user";
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const results = trpc.results.getMyResults.useQuery(undefined, {
    enabled: role === "student",
  });
  const assignments = trpc.assignments.getMine.useQuery(undefined, {
    enabled: role === "student" || role === "teacher" || role === "admin",
  });
  const submissions = trpc.assignments.getMySubmissions.useQuery(undefined, {
    enabled: role === "student",
  });
  const attendance = trpc.attendance.getMyAttendance.useQuery(undefined, {
    enabled: role === "student",
  });
  const sessions = trpc.attendance.getTeacherSessions.useQuery(undefined, {
    enabled: role === "teacher" || role === "admin",
  });
  const children = trpc.parents.getMyChildren.useQuery(undefined, {
    enabled: role === "parent",
  });
  const currentChild =
    children.data?.find((child) => child.id === selectedStudentId) ??
    children.data?.[0];
  const childSummary = trpc.parents.getChildSummary.useQuery(
    { studentId: currentChild?.id ?? 0 },
    { enabled: role === "parent" && Boolean(currentChild) },
  );
  const schoolUsers = trpc.admin.getUsers.useQuery(undefined, {
    enabled: role === "admin",
  });
  const allResults = trpc.results.getAllResults.useQuery(undefined, {
    enabled: role === "admin",
  });

  return (
    <Page>
      <View style={styles.heading}>
        <AppText style={styles.title}>المتابعة الدراسية</AppText>
        <AppText muted style={styles.subtitle}>
          {role === "parent"
            ? "تابع نتائج الأبناء وواجباتهم وحضورهم"
            : role === "teacher"
              ? "راجع واجباتك وسجلات الحضور"
              : role === "admin"
                ? "ملخص الحسابات والنتائج في المدرسة"
                : "نتائجك وواجباتك وسجل حضورك"}
        </AppText>
      </View>

      {role === "student" ? (
        <>
          <SectionTitle title="النتائج" />
          <Card>
            {results.isLoading ? (
              <AppText muted>جارٍ تحميل النتائج…</AppText>
            ) : results.isError ? (
              <RetryPanel onRetry={() => void results.refetch()} />
            ) : results.data?.length ? (
              results.data.map((item) => (
                <DataRow
                  key={item.id}
                  title={item.subject}
                  detail={`${item.semester} · ${item.academicYear}`}
                  value={item.score != null ? `${item.score}%` : String(item.grade ?? "—")}
                />
              ))
            ) : (
              <EmptyState title="لا توجد نتائج مسجلة بعد" icon="award" />
            )}
          </Card>
          <SectionTitle title="الواجبات" />
          <Card>
            {assignments.isLoading ? (
              <AppText muted>جارٍ تحميل الواجبات…</AppText>
            ) : assignments.isError ? (
              <RetryPanel onRetry={() => void assignments.refetch()} />
            ) : assignments.data?.length ? (
              assignments.data.map((item) => {
                const submission = submissions.data?.find((entry) => entry.assignmentId === item.id);
                return (
                  <DataRow
                    key={item.id}
                    title={item.title}
                    detail={`${item.subject} · ${submission ? "تم التسليم" : "لم يُسلّم بعد"}`}
                    value={item.dueDate ? dateLabel(item.dueDate) : undefined}
                  />
                );
              })
            ) : (
              <EmptyState title="لا توجد واجبات حالياً" icon="clipboard" />
            )}
          </Card>
          <SectionTitle title="الحضور" />
          <Card>
            {attendance.isLoading ? (
              <AppText muted>جارٍ تحميل سجل الحضور…</AppText>
            ) : attendance.isError ? (
              <RetryPanel onRetry={() => void attendance.refetch()} />
            ) : attendance.data?.length ? (
              attendance.data.map((entry) => (
                <DataRow
                  key={entry.id}
                  title={entry.subject}
                  detail={dateLabel(entry.attendanceDate)}
                  value={attendanceLabel(entry.status)}
                />
              ))
            ) : (
              <EmptyState title="لا يوجد سجل حضور بعد" icon="calendar" />
            )}
          </Card>
        </>
      ) : null}

      {role === "parent" ? (
        <>
          <SectionTitle title="اختر الطالب" />
          <Card>
            {children.isLoading ? (
              <AppText muted>جارٍ تحميل بيانات الأبناء…</AppText>
            ) : children.isError ? (
              <RetryPanel onRetry={() => void children.refetch()} />
            ) : children.data?.length ? (
              <View style={styles.childList}>
                {children.data.map((child) => {
                  const active = child.id === currentChild?.id;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={child.id}
                      onPress={() => setSelectedStudentId(child.id)}
                      style={[
                        styles.childButton,
                        {
                          backgroundColor: active ? colors.primary : colors.secondary,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      testID={`activity-child-${child.id}`}
                    >
                      <AppText style={{ color: active ? colors.primaryForeground : colors.foreground }}>
                        {child.name || `طالب ${child.id}`}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <EmptyState title="لا يوجد طالب مرتبط بحسابك" icon="users" />
            )}
          </Card>
          {currentChild ? (
            <>
              <SectionTitle title="النتائج والواجبات" />
              <Card>
                {childSummary.isLoading ? (
                  <AppText muted>جارٍ تحميل ملخص الطالب…</AppText>
                ) : childSummary.isError ? (
                  <RetryPanel onRetry={() => void childSummary.refetch()} />
                ) : childSummary.data ? (
                  <>
                    {childSummary.data.results.length ? (
                      childSummary.data.results.map((item) => (
                        <DataRow
                          key={`result-${item.id}`}
                          title={item.subject}
                          detail={`${item.semester} · ${item.academicYear}`}
                          value={item.score != null ? `${item.score}%` : String(item.grade ?? "—")}
                        />
                      ))
                    ) : (
                      <AppText muted>لا توجد نتائج مسجلة بعد</AppText>
                    )}
                    {childSummary.data.assignments.map((item) => {
                      const submission = childSummary.data.submissions.find((entry) => entry.assignmentId === item.id);
                      return (
                        <DataRow
                          key={`assignment-${item.id}`}
                          title={item.title}
                          detail={`${item.subject} · ${submission ? "تم التسليم" : "لم يُسلّم بعد"}`}
                          value={item.dueDate ? dateLabel(item.dueDate) : undefined}
                        />
                      );
                    })}
                    {!childSummary.data.assignments.length ? (
                      <AppText muted>لا توجد واجبات حالياً</AppText>
                    ) : null}
                  </>
                ) : null}
              </Card>
              <SectionTitle title="الحضور" />
              <Card>
                {childSummary.data?.attendance.length ? (
                  childSummary.data.attendance.map((entry) => (
                    <DataRow
                      key={`attendance-${entry.id}`}
                      title={entry.subject}
                      detail={dateLabel(entry.attendanceDate)}
                      value={attendanceLabel(entry.status)}
                    />
                  ))
                ) : (
                  <EmptyState title="لا يوجد سجل حضور بعد" icon="calendar" />
                )}
              </Card>
            </>
          ) : null}
        </>
      ) : null}

      {role === "teacher" ? (
        <>
          <SectionTitle title="واجباتي" />
          <Card>
            {assignments.isLoading ? (
              <AppText muted>جارٍ تحميل الواجبات…</AppText>
            ) : assignments.isError ? (
              <RetryPanel onRetry={() => void assignments.refetch()} />
            ) : assignments.data?.length ? (
              assignments.data.map((item) => (
                <DataRow
                  key={item.id}
                  title={item.title}
                  detail={`${item.subject} · ${item.schoolSection === "primary" ? "أساسي" : "متوسط"} · الصف ${item.classLevel}`}
                  value={item.dueDate ? dateLabel(item.dueDate) : undefined}
                />
              ))
            ) : (
              <EmptyState title="لم تُنشئ واجبات بعد" icon="clipboard" />
            )}
          </Card>
          <SectionTitle title="جلسات الحضور" />
          <Card>
            {sessions.isLoading ? (
              <AppText muted>جارٍ تحميل الجلسات…</AppText>
            ) : sessions.isError ? (
              <RetryPanel onRetry={() => void sessions.refetch()} />
            ) : sessions.data?.length ? (
              sessions.data.map((item) => (
                <DataRow
                  key={item.id}
                  title={item.subject}
                  detail={`${item.schoolSection === "primary" ? "أساسي" : "متوسط"} · الصف ${item.classLevel}`}
                  value={dateLabel(item.attendanceDate)}
                />
              ))
            ) : (
              <EmptyState title="لا توجد جلسات حضور مسجلة" icon="calendar" />
            )}
          </Card>
        </>
      ) : null}

      {role === "admin" ? (
        <>
          <SectionTitle title="حسابات المدرسة" />
          <Card>
            {schoolUsers.isLoading ? (
              <AppText muted>جارٍ تحميل الحسابات…</AppText>
            ) : schoolUsers.isError ? (
              <RetryPanel onRetry={() => void schoolUsers.refetch()} />
            ) : (
              <>
                <AppText style={styles.adminCount}>{schoolUsers.data?.length ?? 0}</AppText>
                <AppText muted>حساب مدرسي</AppText>
              </>
            )}
          </Card>
          <SectionTitle title="النتائج المسجلة" />
          <Card>
            {allResults.isLoading ? (
              <AppText muted>جارٍ تحميل النتائج…</AppText>
            ) : allResults.isError ? (
              <RetryPanel onRetry={() => void allResults.refetch()} />
            ) : (
              <>
                <AppText style={styles.adminCount}>{allResults.data?.length ?? 0}</AppText>
                <AppText muted>نتيجة دراسية</AppText>
              </>
            )}
          </Card>
        </>
      ) : null}

      {role === "user" ? (
        <Card>
          <EmptyState
            title="حسابك بانتظار التفعيل"
            detail="تواصل مع إدارة المدرسة لتحديد دورك."
            icon="user-check"
          />
        </Card>
      ) : null}
    </Page>
  );
}

function DataRow({
  title,
  detail,
  value,
}: {
  title: string;
  detail?: string;
  value?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={styles.rowBody}>
        <AppText style={styles.rowTitle}>{title}</AppText>
        {detail ? <AppText muted style={styles.rowDetail}>{detail}</AppText> : null}
      </View>
      {value ? <AppText style={styles.rowValue}>{value}</AppText> : null}
    </View>
  );
}

function RetryPanel({ onRetry }: { onRetry: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onRetry}
      style={styles.retry}
    >
      <Feather name="refresh-cw" size={16} color={colors.primary} />
      <AppText style={{ color: colors.primary }}>تعذر التحميل — أعد المحاولة</AppText>
    </Pressable>
  );
}

function attendanceLabel(status: string) {
  const labels: Record<string, string> = {
    present: "حاضر",
    absent: "غائب",
    late: "متأخر",
    excused: "بعذر",
  };
  return labels[status] ?? status;
}

const styles = StyleSheet.create({
  heading: { gap: 3, marginBottom: 1 },
  title: { fontFamily: "Cairo_700Bold", fontSize: 22, lineHeight: 33 },
  subtitle: { fontSize: 12, lineHeight: 20 },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 11,
    gap: 9,
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: "Cairo_600SemiBold", fontSize: 13, lineHeight: 21 },
  rowDetail: { fontSize: 11, lineHeight: 18 },
  rowValue: { fontFamily: "Cairo_700Bold", fontSize: 12, lineHeight: 19 },
  childList: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  childButton: { borderWidth: 1, borderRadius: 24, paddingHorizontal: 13, paddingVertical: 7 },
  adminCount: { fontFamily: "Cairo_700Bold", fontSize: 25 },
  retry: { flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingVertical: 6 },
});
