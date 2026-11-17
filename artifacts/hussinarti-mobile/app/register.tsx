import React, { useState } from "react";
import { Keyboard, Pressable, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { AppButton, AppText, Card, Page } from "@/components/ui";
import { useColors } from "@/hooks/useColors";

type SchoolSection = "primary" | "middle";

export default function StudentRegistrationScreen() {
  const colors = useColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [section, setSection] = useState<SchoolSection>("primary");
  const [classLevel, setClassLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submitRegistration() {
    Keyboard.dismiss();
    setError("");
    setLoading(true);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      if (!domain) throw new Error("عنوان المنصة غير مضبوط في التطبيق.");

      const response = await fetch(`https://${domain}/api/mobile/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          schoolSection: section,
          classLevel,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "تعذر إرسال طلب التسجيل. حاول مرة أخرى.");
      }
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر الاتصال بالمنصة. تحقق من الإنترنت.");
    } finally {
      setLoading(false);
    }
  }

  const readyToSubmit = name.trim().length >= 2 && email.trim().length > 0 && password.length >= 8;

  return (
    <Page withTabs={false} contentStyle={styles.page}>
      <View style={styles.heading}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="رجوع">
          <Feather name="arrow-right" size={23} color={colors.primary} />
        </Pressable>
        <AppText style={styles.title}>تسجيل طالب جديد</AppText>
        <AppText muted>أرسل بياناتك لإدارة المدرسة لمراجعتها وتفعيل حسابك.</AppText>
      </View>

      <Card style={styles.card}>
        {submitted ? (
          <View style={styles.success}>
            <Feather name="check-circle" size={34} color={colors.primary} />
            <AppText style={styles.successTitle}>تم إرسال طلبك</AppText>
            <AppText muted style={styles.centerText}>
              حسابك بانتظار مراجعة إدارة المدرسة وتفعيله. تواصل مع الإدارة لمعرفة حالة الطلب.
            </AppText>
            <AppButton title="العودة إلى تسجيل الدخول" onPress={() => router.replace("/")} />
          </View>
        ) : (
          <View style={styles.form}>
            <Field label="اسم الطالب" value={name} onChangeText={setName} placeholder="الاسم الكامل" colors={colors} autoComplete="name" />
            <Field label="البريد الإلكتروني" value={email} onChangeText={setEmail} placeholder="name@example.com" colors={colors} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
            <Field label="كلمة المرور (8 أحرف على الأقل)" value={password} onChangeText={setPassword} placeholder="أنشئ كلمة مرور" colors={colors} secureTextEntry autoCapitalize="none" />

            <AppText style={styles.label}>القسم الدراسي</AppText>
            <View style={styles.options}>
              <Choice title="ابتدائي" selected={section === "primary"} onPress={() => { setSection("primary"); setClassLevel(1); }} colors={colors} />
              <Choice title="متوسط" selected={section === "middle"} onPress={() => { setSection("middle"); setClassLevel(1); }} colors={colors} />
            </View>

            <AppText style={styles.label}>الصف</AppText>
            <View style={styles.options}>
              {Array.from({ length: section === "primary" ? 6 : 3 }, (_, index) => index + 1).map((level) => (
                <Choice key={level} title={String(level)} selected={classLevel === level} onPress={() => setClassLevel(level)} colors={colors} compact />
              ))}
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.destructiveSoft }]}>
                <Feather name="alert-circle" size={17} color={colors.destructive} />
                <AppText style={{ color: colors.destructive, flex: 1 }}>{error}</AppText>
              </View>
            ) : null}

            <AppButton
              title="إرسال طلب التسجيل"
              onPress={() => void submitRegistration()}
              disabled={!readyToSubmit}
              loading={loading}
            />
            <AppText muted style={styles.note}>
              التسجيل لا يمنح صلاحية الدخول تلقائيًا؛ إدارة المدرسة تراجع البيانات وتفعّل الحساب.
            </AppText>
          </View>
        )}
      </Card>
    </Page>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
} & Omit<React.ComponentProps<typeof TextInput>, "value" | "onChangeText" | "placeholder">) {
  return (
    <View style={styles.field}>
      <AppText style={styles.label}>{label}</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
        textAlign="right"
        {...inputProps}
      />
    </View>
  );
}

function Choice({
  title,
  selected,
  onPress,
  colors,
  compact = false,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.choice,
        compact && styles.compactChoice,
        { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.accent : colors.background },
      ]}
    >
      <AppText style={{ color: selected ? colors.primary : colors.foreground }}>{title}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { gap: 18, paddingBottom: 30 },
  heading: { gap: 9 },
  title: { fontFamily: "Cairo_700Bold", fontSize: 23, lineHeight: 34 },
  card: { padding: 18 },
  form: { gap: 15 },
  field: { gap: 7 },
  label: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontFamily: "Cairo_400Regular", fontSize: 14, writingDirection: "rtl" },
  options: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  choice: { minWidth: 92, minHeight: 43, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  compactChoice: { minWidth: 44, paddingHorizontal: 10 },
  errorBox: { borderRadius: 10, padding: 10, flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  success: { alignItems: "center", gap: 14, paddingVertical: 20 },
  successTitle: { fontFamily: "Cairo_700Bold", fontSize: 20 },
  centerText: { textAlign: "center" },
  note: { textAlign: "center", fontSize: 11, lineHeight: 18 },
});
