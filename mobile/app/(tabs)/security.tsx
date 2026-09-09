import { useState } from "react";
import { Text, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { changePassword } from "@/lib/queries";

export default function Security() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    if (!currentPassword || !newPassword) {
      setError("Fill in your current and new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Security" />
      <Screen>
        <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-1">Change password</Text>
        <Text className="text-[13px] text-[#6B7280] mb-5">
          You&apos;ll stay signed in on this device after changing it.
        </Text>

        <Field
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <Field
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="At least 8 characters"
        />
        <Field
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          placeholder="Re-enter your new password"
        />

        {error ? <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text> : null}
        {success ? <Text className="text-[13px] text-[#16A34A] mb-4">Password changed.</Text> : null}

        <Btn
          label={submitting ? "Changing..." : "Change Password"}
          disabled={submitting}
          onPress={handleSubmit}
        />
      </Screen>
    </View>
  );
}
