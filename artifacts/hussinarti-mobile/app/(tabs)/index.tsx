import React, { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/context/SessionContext";
import {
  AppText,
  Card,
  dateLabel,
  EmptyState,
  MetricCard,
  Page,
  SectionTitle,
} from "@/components/ui";
import { useColors } from "@/hooks/useColors";

const roleLabels: Record<string, string> = {
  admin: "مدير المدرسة",
  teacher: "معلم",
  student: "طالب",
  parent: "وليّ أمر",
  user: "حساب غير مكتمل",
};

const attendanceLabels: Record<string, string> = {
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "بعذر",
};

function Row({
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
      <View style={styles.rowText}>
        <AppText style={styles.rowTitle}>{title}</AppText>
        {detail ? <AppText muted style={styles.rowDetail}>{detail}</AppText> : null}
      </View>
      {value ? <AppText style={styles.rowValue}>{value}</AppText> : null}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const { user } = useSession();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const role = user?.role ?? "user";

  const results = trpc.results.getMyResults.useQuery(undefined, {
    enabled: role === "student",
  });
  const assignments = trpc.assignments.getMine.useQuery(undefined, {
    enabled: role === "student" || role === "teacher" || role === "admin",
  });
  const attendance = trpc.attendance.getMyAttendance.useQuery(undefined, {
    enabled: role === "student",
  });
  const teacherSessions = trpc.attendance.getTeacherSessions.useQuery(undefined, {
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
  const notifications = trpc.notifications.getNotifications.useQuery(undefined, {
    enabled: Boolean(user),
  });

  return (
    <Page>
      <View style={styles.topBar}>
        <View style={styles.brandText}>
          <AppText style={styles.brandTitle}>مدارس حسينارتي</AppText>
          <AppText muted style={styles.brandSubtitle}>{roleLabels[role]}</AppText>
        </View>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.brandMark}
          accessibilityLabel="شعار مدارس حسينارتي"
        />
      </View>

      <Card style={[styles.welcomeCard, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
        <View style={[styles.welcomeIcon, { backgroundColor: colors.primaryForeground }]}>
          <Feather name="sun" size={19} color={colors.primary} />
        </View>
        <AppText style={[styles.welcomeTitle, { color: colors.primaryForeground }]}>
          مرحباً، {user?.name?.trim() || "بك"}
        </AppText>
        <AppText style={[styles.welcomeDetail, { color: colors.primaryMuted }]}>
          {user?.schoolSection
            ? `${user.schoolSection === "primary" ? "المرحلة الأساسية" : "المرحلة المتوسطة"}${user.classLevel ? ` · الصف ${user.classLevel}` : ""}`
            : "تابع دراستك وتواصلك مع المدرسة من مكان واحد"}
        </AppText>
      </Card>

      {role === "student" ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label="النتائج" value={results.data?.length ?? "—"} icon="award" />
            <MetricCard label="الواجبات" value={assignments.data?.length ?? "—"} icon="clipboard" />
            <MetricCard label="سجلات الحضور" value={attendance.data?.length ?? "—"} icon="calendar" />
          </View>
          <SectionTitle title="آخر النتائج" />
          <Card>
            {results.isLoading ? (
              <AppText muted>جارٍ تحميل النتائج…</AppText>
            ) : results.isError ? (
              <RetryText text="تعذر تحميل النتائج" onRetry={() => void results.refetch()} />
            ) : results.data?.length ? (
              results.data.slice(0, 4).map((item) => (
                <Row
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
          <SectionTitle title="الواجبات القادمة" />
          <Card>
            {assignments.isLoading ? (
              <AppText muted>جارٍ تحميل الواجبات…</AppText>
            ) : assignments.isError ? (
              <RetryText text="تعذر تحميل الواجبات" onRetry={() => void assignments.refetch()} />
            ) : assignments.data?.length ? (
              assignments.data.slice(0, 4).map((item) => (
                <Row
                  key={item.id}
                  title={item.title}
                  detail={item.subject}
                  value={item.dueDate ? dateLabel(item.dueDate) : undefined}
                />
              ))
            ) : (
              <EmptyState title="لا توجد واجبات حالياً" icon="check-circle" />
            )}
          </Card>
        </>
      ) : null}

      {role === "parent" ? (
        <>
          <SectionTitle title="أبنائي" />
          <Card>
            {children.isLoading ? (
              <AppText muted>جارٍ تحميل بيانات الأبناء…</AppText>
            ) : children.isError ? (
              <RetryText text="تعذر تحميل بيانات الأبناء" onRetry={() => void children.refetch()} />
            ) : children.data?.length ? (
              <>
                <View style={styles.childChoices}>
                  {children.data.map((child) => {
                    const active = child.id === currentChild?.id;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={child.id}
                        onPress={() => setSelectedStudentId(child.id)}
                        style={[
                          styles.childChip,
                          {
                            backgroundColor: active ? colors.primary : colors.secondary,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
                        testID={`child-${child.id}`}
                      >
                        <AppText style={[styles.childChipText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                          {child.name || `طالب ${child.id}`}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
                {currentChild ? (
                  <AppText muted style={styles.childInfo}>
                    {currentChild.schoolSection === "primary" ? "المرحلة الأساسية" : "المرحلة المتوسطة"} · الصف {currentChild.classLevel ?? "—"}
                  </AppText>
                ) : null}
              </>
            ) : (
              <EmptyState
                title="لا يوجد طالب مرتبط بحسابك"
                detail="تواصل مع إدارة المدرسة لربط حسابك بأبنائك."
                icon="users"
              />
            )}
          </Card>
          {currentChild ? (
            <>
              <View style={styles.metrics}>
                <MetricCard label="النتائج" value={childSummary.data?.results.length ?? "—"} icon="award" />
                <MetricCard label="الواجبات" value={childSummary.data?.assignments.length ?? "—"} icon="clipboard" />
                <MetricCard label="الحضور" value={childSummary.data?.attendance.length ?? "—"} icon="calendar" />
              </View>
              <SectionTitle title="أحدث النتائج" />
              <Card>
                {childSummary.isLoading ? (
                  <AppText muted>جارٍ تحميل ملخص الطالب…</AppText>
                ) : childSummary.isError ? (
                  <RetryText text="تعذر تحميل ملخص الطالب" onRetry={() => void childSummary.refetch()} />
                ) : childSummary.data?.results.length ? (
                  childSummary.data.results.slice(0, 4).map((item) => (
                    <Row
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
            </>
          ) : null}
        </>
      ) : null}

      {role === "teacher" ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label="واجباتي" value={assignments.data?.length ?? "—"} icon="clipboard" />
            <MetricCard label="جلسات الحضور" value={teacherSessions.data?.length ?? "—"} icon="calendar" />
          </View>
          <SectionTitle title="أحدث واجباتي" />
          <Card>
            {assignments.isLoading ? (
              <AppText muted>جارٍ تحميل الواجبات…</AppText>
            ) : assignments.isError ? (
              <RetryText text="تعذر تحميل الواجبات" onRetry={() => void assignments.refetch()} />
            ) : assignments.data?.length ? (
              assignments.data.slice(0, 5).map((item) => (
                <Row
                  key={item.id}
                  title={item.title}
                  detail={`${item.subject} · الصف ${item.classLevel}`}
                  value={dateLabel(item.dueDate)}
                />
              ))
            ) : (
              <EmptyState title="لم تُنشئ واجبات بعد" icon="clipboard" />
            )}
          </Card>
        </>
      ) : null}

      {role === "admin" ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label="الحسابات" value={schoolUsers.data?.length ?? "—"} icon="users" />
            <MetricCard label="النتائج المسجلة" value={allResults.data?.length ?? "—"} icon="award" />
            <MetricCard label="الإشعارات" value={notifications.data?.length ?? "—"} icon="bell" />
          </View>
          <SectionTitle title="ملخص المدرسة" />
          <Card>
            <AppText muted>
              تعرض هذه اللوحة ملخص بيانات المدرسة الحالية. إدارة الحسابات والدرجات التفصيلية متاحة من لوحة الويب.
            </AppText>
          </Card>
        </>
      ) : null}

      {role === "user" ? (
        <Card>
          <EmptyState
            title="حسابك بانتظار التفعيل"
            detail="تواصل مع إدارة المدرسة لتحديد دورك وربط بياناتك المدرسية."
            icon="user-check"
          />
        </Card>
      ) : null}

      {notifications.data?.length ? (
        <>
          <SectionTitle title="إعلانات المدرسة" />
          <Card>
            {notifications.data.slice(0, 3).map((item) => (
              <Row key={item.id} title={item.title} detail={item.message} />
            ))}
          </Card>
        </>
      ) : null}
    </Page>
  );
}

function RetryText({ text, onRetry }: { text: string; onRetry: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onRetry}
      style={styles.retry}
    >
      <AppText style={{ color: colors.destructive }}>{text}</AppText>
      <Feather name="refresh-cw" size={16} color={colors.primary} />
      <AppText style={{ color: colors.primary }}>إعادة المحاولة</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandText: { gap: 1 },
  brandTitle: { fontFamily: "Cairo_700Bold", fontSize: 19, lineHeight: 28 },
  brandSubtitle: { fontSize: 12, lineHeight: 18 },
  brandMark: { width: 42, height: 42, borderRadius: 12 },
  welcomeCard: { padding: 18, alignItems: "flex-end", gap: 7 },
  welcomeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  welcomeTitle: { fontFamily: "Cairo_700Bold", fontSize: 21, lineHeight: 31 },
  welcomeDetail: { fontSize: 12, lineHeight: 20 },
  metrics: { flexDirection: "row-reverse", gap: 9 },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    gap: 10,
  },
  rowText: { flex: 1, gap: 1 },
  rowTitle: { fontFamily: "Cairo_600SemiBold", fontSize: 13, lineHeight: 21 },
  rowDetail: { fontSize: 11, lineHeight: 18 },
  rowValue: { fontFamily: "Cairo_700Bold", fontSize: 12, lineHeight: 19 },
  childChoices: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  childChip: { borderWidth: 1, borderRadius: 30, paddingHorizontal: 13, paddingVertical: 6 },
  childChipText: { fontFamily: "Cairo_600SemiBold", fontSize: 12, lineHeight: 19 },
  childInfo: { fontSize: 12 },
  retry: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    flexWrap: "wrap",
    paddingVertical: 5,
  },
});
