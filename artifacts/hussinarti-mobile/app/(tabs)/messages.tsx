import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/context/SessionContext";
import { AppButton, AppText, Card, dateLabel, EmptyState, Page, SectionTitle } from "@/components/ui";
import { useColors } from "@/hooks/useColors";

export default function MessagesScreen() {
  const colors = useColors();
  const { user } = useSession();
  const utils = trpc.useUtils();
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const inbox = trpc.messages.getMine.useQuery();
  const recipients = trpc.messages.getUsers.useQuery();
  const selectedRecipientId =
    recipients.data?.some((person) => person.id === recipientId)
      ? recipientId
      : recipients.data?.[0]?.id ?? null;
  const visibleRecipients = (recipients.data ?? [])
    .filter((person) => {
      const search = recipientSearch.trim().toLowerCase();
      return !search || (person.name ?? "").toLowerCase().includes(search) || String(person.id).includes(search);
    })
    .slice(0, 24);
  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: async () => {
      await utils.messages.getMine.invalidate();
      setSubject("");
      setBody("");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  async function handleSend() {
    if (!selectedRecipientId || subject.trim().length < 2 || !body.trim()) return;
    try {
      await sendMessage.mutateAsync({
        recipientId: selectedRecipientId,
        subject: subject.trim(),
        body: body.trim(),
      });
    } catch {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  const peopleById = new Map((recipients.data ?? []).map((person) => [person.id, person]));

  return (
    <Page>
      <View style={styles.heading}>
        <AppText style={styles.title}>المراسلات</AppText>
        <AppText muted style={styles.subtitle}>
          تواصل مع إدارة المدرسة والمعلمين
        </AppText>
      </View>

      <SectionTitle title="رسالة جديدة" />
      <Card style={styles.composeCard}>
        <AppText style={styles.fieldLabel}>المستلم</AppText>
        {recipients.isLoading ? (
          <AppText muted>جارٍ تحميل قائمة المستلمين…</AppText>
        ) : recipients.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void recipients.refetch()} style={styles.retry}>
            <Feather name="refresh-cw" size={16} color={colors.primary} />
            <AppText style={{ color: colors.primary }}>تعذر تحميل المستلمين — أعد المحاولة</AppText>
          </Pressable>
        ) : recipients.data?.length ? (
          <>
            <TextInput
              accessibilityLabel="البحث عن مستلم"
              onChangeText={setRecipientSearch}
              placeholder="ابحث باسم المستلم أو رقمه"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              testID="recipient-search"
              value={recipientSearch}
            />
            <View style={styles.recipientList}>
            {visibleRecipients.map((person) => {
              const active = person.id === selectedRecipientId;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={person.id}
                  onPress={() => setRecipientId(person.id)}
                  style={[
                    styles.recipientChip,
                    {
                      backgroundColor: active ? colors.primary : colors.secondary,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  testID={`recipient-${person.id}`}
                >
                  <AppText style={[styles.recipientText, { color: active ? colors.primaryForeground : colors.foreground }]}>
                    {person.name || `حساب ${person.id}`}
                  </AppText>
                </Pressable>
              );
            })}
            </View>
            {!visibleRecipients.length ? (
              <AppText muted>لا يوجد مستلم بهذا الاسم أو الرقم.</AppText>
            ) : null}
            {visibleRecipients.length === 24 ? (
              <AppText muted style={styles.searchHint}>اكتب مزيداً من الاسم لتضييق النتائج.</AppText>
            ) : null}
          </>
        ) : (
          <AppText muted>لا يوجد مستلم متاح للمراسلة.</AppText>
        )}

        <AppText style={styles.fieldLabel}>الموضوع</AppText>
        <TextInput
          accessibilityLabel="موضوع الرسالة"
          maxLength={120}
          onChangeText={setSubject}
          placeholder="اكتب موضوع الرسالة"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          testID="message-subject"
          value={subject}
        />
        <AppText style={styles.fieldLabel}>الرسالة</AppText>
        <TextInput
          accessibilityLabel="نص الرسالة"
          maxLength={3000}
          multiline
          onChangeText={setBody}
          placeholder="اكتب رسالتك هنا"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, styles.bodyInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          testID="message-body"
          textAlignVertical="top"
          value={body}
        />
        {sendMessage.error ? (
          <AppText style={{ color: colors.destructive }}>
            {sendMessage.error.message || "تعذر إرسال الرسالة"}
          </AppText>
        ) : null}
        <AppButton
          disabled={!selectedRecipientId || subject.trim().length < 2 || !body.trim()}
          icon="send"
          loading={sendMessage.isPending}
          onPress={() => void handleSend()}
          title="إرسال الرسالة"
          testID="send-message"
        />
      </Card>

      <SectionTitle title="الوارد والصادر" />
      <Card>
        {inbox.isLoading ? (
          <AppText muted>جارٍ تحميل المراسلات…</AppText>
        ) : inbox.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void inbox.refetch()} style={styles.retry}>
            <Feather name="refresh-cw" size={16} color={colors.primary} />
            <AppText style={{ color: colors.primary }}>تعذر تحميل الرسائل — أعد المحاولة</AppText>
          </Pressable>
        ) : inbox.data?.length ? (
          inbox.data.map((message) => {
            const incoming = message.recipientId === user?.id;
            const otherId = incoming ? message.senderId : message.recipientId;
            const otherName = peopleById.get(otherId)?.name || `حساب ${otherId}`;
            return (
              <View key={message.id} style={[styles.message, { borderBottomColor: colors.border }]}>
                <View style={styles.messageTop}>
                  <View style={[styles.directionIcon, { backgroundColor: colors.accent }]}>
                    <Feather
                      name={incoming ? "corner-up-right" : "corner-down-left"}
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.messageHeading}>
                    <AppText style={styles.messageSubject}>{message.subject}</AppText>
                    <AppText muted style={styles.messageMeta}>
                      {incoming ? "من" : "إلى"} {otherName} · {dateLabel(message.createdAt)}
                    </AppText>
                  </View>
                </View>
                <AppText style={styles.messageBody}>{message.body}</AppText>
              </View>
            );
          })
        ) : (
          <EmptyState
            title="لا توجد رسائل بعد"
            detail="ستظهر هنا رسائلك الواردة والصادرة."
            icon="message-circle"
          />
        )}
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  heading: { gap: 3, marginBottom: 1 },
  title: { fontFamily: "Cairo_700Bold", fontSize: 22, lineHeight: 33 },
  subtitle: { fontSize: 12, lineHeight: 20 },
  composeCard: { gap: 10 },
  fieldLabel: { fontFamily: "Cairo_600SemiBold", fontSize: 13, lineHeight: 21 },
  recipientList: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 7, marginBottom: 4 },
  recipientChip: { borderWidth: 1, borderRadius: 22, paddingHorizontal: 11, paddingVertical: 5 },
  recipientText: { fontFamily: "Cairo_600SemiBold", fontSize: 11, lineHeight: 18 },
  searchHint: { fontSize: 11 },
  input: {
    borderWidth: 1,
    borderRadius: 11,
    minHeight: 47,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: "Cairo_400Regular",
    fontSize: 13,
    textAlign: "right",
    writingDirection: "rtl",
  },
  bodyInput: { minHeight: 110 },
  retry: { flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingVertical: 5 },
  message: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 13, gap: 9 },
  messageTop: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  directionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  messageHeading: { flex: 1, gap: 1 },
  messageSubject: { fontFamily: "Cairo_700Bold", fontSize: 13, lineHeight: 21 },
  messageMeta: { fontSize: 10, lineHeight: 17 },
  messageBody: { fontSize: 12, lineHeight: 21 },
});
