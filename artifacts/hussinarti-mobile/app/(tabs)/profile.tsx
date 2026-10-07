import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { AppButton, AppText, Card, Page, SectionTitle } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { useColors } from "@/hooks/useColors";

const roleLabels: Record<string, string> = {
  admin: "مدير المدرسة",
  teacher: "معلم",
  student: "طالب",
  parent: "وليّ أمر",
  user: "حساب غير مكتمل",
};

export default function ProfileScreen() {
  const colors = useColors();
  const { user, ready, signOut } = useSession();

  useEffect(() => {
    if (ready && !user) router.replace("/");
  }, [ready, user]);

  async function handleSignOut() {
    await signOut();
    router.replace("/");
  }

  if (!user) return null;

  const section =
    user.schoolSection === "primary"
      ? "المرحلة الأساسية"
      : user.schoolSection === "middle"
        ? "المرحلة المتوسطة"
        : null;

  return (
    <Page>
      <View style={styles.heading}>
        <AppText style={styles.title}>حسابي</AppText>
        <AppText muted style={styles.subtitle}>بيانات الحساب المدرسي</AppText>
      </View>

      <Card style={styles.profileCard}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.avatar}
          accessibilityLabel="شعار مدارس حسينارتي"
        />
        <AppText style={styles.name}>{user.name?.trim() || "مستخدم المدرسة"}</AppText>
        <View style={[styles.rolePill, { backgroundColor: colors.accent }]}>
          <AppText style={[styles.roleText, { color: colors.primary }]}>
            {roleLabels[user.role] ?? "مستخدم"}
          </AppText>
        </View>
      </Card>

      <SectionTitle title="معلومات الحساب" />
      <Card style={styles.detailsCard}>
        <ProfileRow icon="hash" label="رقم الحساب" value={String(user.id)} />
        {user.studentNumber ? (
          <ProfileRow icon="book" label="الرقم الدراسي" value={user.studentNumber} />
        ) : null}
        {section ? <ProfileRow icon="layers" label="المرحلة" value={section} /> : null}
        {user.classLevel ? <ProfileRow icon="grid" label="الصف" value={String(user.classLevel)} /> : null}
        <ProfileRow icon="shield" label="نوع الحساب" value={roleLabels[user.role] ?? "مستخدم"} />
      </Card>

      <Card style={styles.signOutCard}>
        <View style={styles.signOutInfo}>
          <AppText style={styles.signOutTitle}>تسجيل الخروج</AppText>
          <AppText muted style={styles.signOutDetail}>
            سيُحذف رمز الجلسة المحفوظ على هذا الجهاز.
          </AppText>
        </View>
        <AppButton
          icon="log-out"
          onPress={() => void handleSignOut()}
          title="خروج"
          variant="outline"
          testID="sign-out"
        />
      </Card>
    </Page>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.profileRow, { borderBottomColor: colors.border }]}>
      <View style={styles.rowStart}>
        <Feather name={icon} size={17} color={colors.primary} />
        <AppText muted>{label}</AppText>
      </View>
      <AppText style={styles.rowValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 3, marginBottom: 1 },
  title: { fontFamily: "Cairo_700Bold", fontSize: 22, lineHeight: 33 },
  subtitle: { fontSize: 12, lineHeight: 20 },
  profileCard: { alignItems: "center", paddingVertical: 22, gap: 7 },
  avatar: { width: 78, height: 78, borderRadius: 22, marginBottom: 3 },
  name: { fontFamily: "Cairo_700Bold", fontSize: 19, lineHeight: 28 },
  rolePill: { paddingHorizontal: 13, paddingVertical: 4, borderRadius: 22 },
  roleText: { fontFamily: "Cairo_600SemiBold", fontSize: 11, lineHeight: 18 },
  detailsCard: { gap: 0 },
  profileRow: {
    minHeight: 48,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  rowStart: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  rowValue: { fontFamily: "Cairo_600SemiBold", fontSize: 12 },
  signOutCard: { gap: 14 },
  signOutInfo: { gap: 3 },
  signOutTitle: { fontFamily: "Cairo_700Bold", fontSize: 14 },
  signOutDetail: { fontSize: 11, lineHeight: 18 },
});
