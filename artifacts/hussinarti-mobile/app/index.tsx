import React, { useEffect, useState, type ReactNode } from "react";
import {
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useMobileLogin } from "@workspace/api-client-react";
import { AppButton, AppText, Card, Page } from "@/components/ui";
import { useColors } from "@/hooks/useColors";
import { useSession } from "@/context/SessionContext";

export default function LoginScreen() {
  const colors = useColors();
  const { user, ready, completeLogin } = useSession();
  const login = useMobileLogin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/(tabs)");
  }, [ready, user]);

  async function handleLogin() {
    Keyboard.dismiss();
    login.reset();
    try {
      const response = await login.mutateAsync({
        data: { identifier: identifier.trim(), password },
      });
      await completeLogin(response);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  const loginError = login.error as (Error & { status?: number }) | null;
  const errorMessage =
    loginError?.status === 401
      ? "المعرّف أو كلمة المرور غير صحيحة"
      : login.isError
        ? "تعذر الاتصال بالمنصة. تحقق من الاتصال ثم أعد المحاولة."
        : null;

  if (!ready) {
    return (
      <Page withTabs={false} contentStyle={styles.loadingContent}>
        <Feather name="loader" size={25} color={colors.primary} />
      </Page>
    );
  }

  return (
    <Page withTabs={false} contentStyle={styles.pageContent}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDeep]}
        style={styles.hero}
      >
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          accessibilityLabel="شعار مدارس حسينارتي"
        />
        <AppText style={[styles.heroTitle, { color: colors.primaryForeground }]}>مدارس حسينارتي</AppText>
        <AppText style={[styles.heroSubtitle, { color: colors.primaryMuted }]}>
          بوابتك لمتابعة الدراسة والتواصل مع المدرسة
        </AppText>
      </LinearGradient>

      <Card style={styles.formCard}>
        <LoginFormContainer onSubmit={() => void handleLogin()}>
          <View style={styles.formHeading}>
            <AppText style={styles.formTitle}>تسجيل الدخول</AppText>
            <AppText muted style={styles.formIntro}>
              استخدم المعرّف وكلمة المرور الخاصة بحسابك المدرسي
            </AppText>
          </View>

          <View style={styles.fieldGroup}>
            <AppText style={styles.fieldLabel}>المعرّف المدرسي</AppText>
            <View style={[styles.inputShell, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Feather name="user" size={18} color={colors.mutedForeground} />
              <TextInput
                accessibilityLabel="المعرّف المدرسي"
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
                onChangeText={(value) => {
                  setIdentifier(value);
                  login.reset();
                }}
                placeholder="أدخل المعرّف أو الرقم الدراسي"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="next"
                style={[styles.input, { color: colors.foreground }]}
                testID="login-identifier"
                value={identifier}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <AppText style={styles.fieldLabel}>كلمة المرور</AppText>
            <View style={[styles.inputShell, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                accessibilityLabel="كلمة المرور"
                autoCapitalize="none"
                autoComplete="current-password"
                onChangeText={(value) => {
                  setPassword(value);
                  login.reset();
                }}
                onSubmitEditing={() => void handleLogin()}
                placeholder="أدخل كلمة المرور"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                secureTextEntry={!showPassword}
                style={[styles.input, { color: colors.foreground }]}
                testID="login-password"
                value={password}
              />
              <Pressable
                accessibilityLabel={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setShowPassword((visible) => !visible)}
                testID="toggle-password"
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>
          </View>

          {errorMessage ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructiveSoft }]}>
              <Feather name="alert-circle" size={17} color={colors.destructive} />
              <AppText style={[styles.errorText, { color: colors.destructive }]}>
                {errorMessage}
              </AppText>
            </View>
          ) : null}

          <AppButton
            disabled={!identifier.trim() || !password}
            loading={login.isPending}
            onPress={() => void handleLogin()}
            title="دخول"
            testID="login-submit"
          />
          <AppText muted style={styles.supportText}>
            إذا تعذر الدخول، تواصل مع إدارة المدرسة لتأكيد بيانات حسابك.
          </AppText>
        </LoginFormContainer>
      </Card>
    </Page>
  );
}

function LoginFormContainer({
  children,
  onSubmit,
}: {
  children: ReactNode;
  onSubmit: () => void;
}) {
  if (Platform.OS === "web") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {children}
      </form>
    );
  }
  return <View style={styles.loginForm}>{children}</View>;
}

const styles = StyleSheet.create({
  pageContent: { gap: 18, paddingBottom: 30 },
  loadingContent: { alignItems: "center", justifyContent: "center" },
  hero: {
    borderRadius: 22,
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 25,
    paddingBottom: 24,
    gap: 6,
  },
  logo: { width: 74, height: 74, borderRadius: 18, marginBottom: 4 },
  heroTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 25,
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },
  formCard: { padding: 20, gap: 16 },
  loginForm: { gap: 16 },
  formHeading: { gap: 3, marginBottom: 2 },
  formTitle: { fontFamily: "Cairo_700Bold", fontSize: 19, lineHeight: 29 },
  formIntro: { fontSize: 12, lineHeight: 19 },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 13 },
  inputShell: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontFamily: "Cairo_400Regular",
    fontSize: 14,
    textAlign: "right",
    writingDirection: "rtl",
    paddingVertical: 8,
  },
  errorBox: {
    borderRadius: 10,
    padding: 10,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 12, lineHeight: 19 },
  supportText: { fontSize: 11, lineHeight: 18, textAlign: "center" },
});
