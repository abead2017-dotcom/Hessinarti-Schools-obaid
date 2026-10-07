import React, { type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";

type AppTextProps = TextProps & { muted?: boolean };

export function AppText({ muted = false, style, ...props }: AppTextProps) {
  const colors = useColors();
  return (
    <Text
      {...props}
      style={[
        styles.text,
        { color: muted ? colors.mutedForeground : colors.foreground },
        style,
      ]}
    />
  );
}

export function Page({
  children,
  withTabs = true,
  contentStyle,
}: {
  children: ReactNode;
  withTabs?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset =
    Platform.OS === "web"
      ? withTabs
        ? 120
        : 34
      : withTabs
        ? insets.bottom + 108
        : insets.bottom + 24;

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 12, paddingBottom: bottomInset },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.sectionTitle}>
      <AppText style={styles.sectionHeading}>{title}</AppText>
      {trailing}
    </View>
  );
}

export function AppButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  icon,
  testID,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "outline" | "danger";
  icon?: keyof typeof Feather.glyphMap;
  testID?: string;
}) {
  const colors = useColors();
  const backgroundColor =
    variant === "primary"
      ? colors.primary
      : variant === "danger"
        ? colors.destructive
        : colors.card;
  const foregroundColor =
    variant === "outline" ? colors.primary : colors.primaryForeground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: variant === "outline" ? colors.border : backgroundColor,
          opacity: disabled || loading ? 0.55 : pressed ? 0.82 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foregroundColor} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={18} color={foregroundColor} /> : null}
          <AppText style={[styles.buttonText, { color: foregroundColor }]}>
            {title}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

export function MetricCard({
  label,
  value,
  icon,
  detail,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  detail?: string;
}) {
  const colors = useColors();
  return (
    <Card style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <AppText style={styles.metricValue}>{value}</AppText>
      <AppText muted style={styles.metricLabel}>
        {label}
      </AppText>
      {detail ? <AppText muted style={styles.metricDetail}>{detail}</AppText> : null}
    </Card>
  );
}

export function EmptyState({
  title,
  detail,
  icon = "inbox",
}: {
  title: string;
  detail?: string;
  icon?: keyof typeof Feather.glyphMap;
}) {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <Feather name={icon} size={24} color={colors.mutedForeground} />
      <AppText style={styles.emptyTitle}>{title}</AppText>
      {detail ? <AppText muted style={styles.emptyDetail}>{detail}</AppText> : null}
    </View>
  );
}

export function dateLabel(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("ar");
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 18,
  },
  text: {
    fontFamily: "Cairo_400Regular",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "right",
    writingDirection: "rtl",
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 9,
  },
  sectionTitle: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
  sectionHeading: {
    fontFamily: "Cairo_700Bold",
    fontSize: 18,
    lineHeight: 27,
  },
  button: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  buttonText: {
    fontFamily: "Cairo_700Bold",
    fontSize: 15,
    lineHeight: 22,
  },
  metricCard: {
    flex: 1,
    minWidth: 100,
    alignItems: "flex-end",
    padding: 14,
    gap: 4,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  metricValue: {
    fontFamily: "Cairo_700Bold",
    fontSize: 24,
    lineHeight: 32,
  },
  metricLabel: { fontSize: 12, lineHeight: 19 },
  metricDetail: { fontSize: 11, lineHeight: 17 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 22,
    gap: 7,
  },
  emptyTitle: {
    fontFamily: "Cairo_700Bold",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  emptyDetail: { fontSize: 12, lineHeight: 19, textAlign: "center" },
});
