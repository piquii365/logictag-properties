import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  Btn,
  Divider,
  ErrorView,
  Field,
  Group,
  Header,
  LoadingView,
  Screen,
  SectionTitle,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";
import {
  getNotificationRecipients,
  replyToManagement,
  sendNotification,
} from "@/lib/queries";
import { isManagementRole, roleLabel, type UserRole } from "@/lib/roles";
import type { NotificationRecipient } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";
import { router } from "expo-router";

export default function ComposeNotification() {
  const { user } = useAuth();
  const isManagement = isManagementRole(user?.role);
  const recipients = useFetch(
    isManagement ? getNotificationRecipients : async () => [],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send() {
    if (!subject.trim()) return setError("Add a subject.");
    if (!body.trim()) return setError("Write a message.");
    if (isManagement && selected.size === 0)
      return setError("Choose at least one recipient.");
    setSending(true);
    setError(null);
    try {
      if (isManagement) {
        await sendNotification({
          userIds: [...selected],
          eventType: "notice",
          subject: subject.trim(),
          body: body.trim(),
        });
      } else {
        await replyToManagement({
          eventType: "message",
          subject: subject.trim(),
          body: body.trim(),
        });
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title={isManagement ? "Send Notice" : "Message Management"} />
      <Screen>
        {isManagement ? (
          <>
            <SectionTitle>Recipients</SectionTitle>
            {recipients.loading ? (
              <LoadingView />
            ) : recipients.error ? (
              <ErrorView
                message={recipients.error}
                onRetry={recipients.refetch}
              />
            ) : (recipients.data ?? []).length === 0 ? (
              <Text className="text-[13px] text-[#6B7280] mb-4">
                No tenants or vendors with accounts yet. Add tenants or vendors
                with a login to send them notices.
              </Text>
            ) : (
              <Group>
                {(recipients.data ?? []).map((r: NotificationRecipient, i) => {
                  const on = selected.has(r.id);
                  return (
                    <View key={r.id}>
                      {i ? <Divider /> : null}
                      <Pressable
                        onPress={() => toggle(r.id)}
                        className="flex-row items-center px-4 py-3 active:bg-[#F8FAFC]"
                      >
                        <Ionicons
                          name={on ? "checkbox" : "square-outline"}
                          size={22}
                          color={on ? "#F96B1F" : "#CBD5E1"}
                        />
                        <View className="ml-3 flex-1">
                          <Text className="text-[15px] text-[#0F2C4A] font-medium">
                            {r.name}
                          </Text>
                          <Text className="text-[12px] text-[#6B7280] mt-0.5">
                            {r.email} · {roleLabel(r.role as UserRole)}
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </Group>
            )}
          </>
        ) : (
          <Text className="text-[13px] text-[#6B7280] mb-4">
            Your message goes to your property management team.
          </Text>
        )}

        <SectionTitle>Message</SectionTitle>
        <Field
          label="Subject"
          value={subject}
          onChangeText={setSubject}
          placeholder="e.g. Rent due reminder"
          maxLength={255}
        />
        <View className="mb-4">
          <Text className="text-[13px] text-[#6B7280] mb-1.5">Message</Text>
          <View className="bg-white border border-[#E5E9F0] rounded-lg px-3.5">
            <TextInput
              className="py-3.5 text-[15px] text-[#0F2C4A]"
              placeholderTextColor="#9CA3AF"
              placeholder="Write your message…"
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </View>

        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
        ) : null}
        <Btn
          label={
            sending ? "Sending…" : isManagement ? "Send Notice" : "Send Message"
          }
          onPress={send}
          disabled={sending}
        />
      </Screen>
    </View>
  );
}
