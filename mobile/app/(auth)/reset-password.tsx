import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import { authErrorMessage, useAuth } from "@/lib/auth";

export default function ResetPassword() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { resetPassword } = useAuth();

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [hide, setHide] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!email) {
      setError("Missing email — go back and request a new reset link.");
      return;
    }
    if (!token.trim() || !password) {
      setError("Enter the reset code and a new password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(email, token.trim(), password);
      Alert.alert("Password reset", "You can now sign in with your new password.", [
        { text: "Sign in", onPress: () => router.replace("/(auth)/sign-in") },
      ]);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="" />
      <Screen>
        <Text className="text-[26px] font-bold text-[#0F2C4A]">
          Enter reset code
        </Text>
        <Text className="text-[14px] text-[#6B7280] mt-1 mb-6 leading-5">
          We sent a reset code for {email ?? "your account"}. Enter it below
          with a new password.
        </Text>

        <Field
          label="Reset code"
          placeholder="6-digit code from your email"
          autoCapitalize="none"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          keyboardType="number-pad"
          maxLength={6}
          value={token}
          onChangeText={(v) => setToken(v.replace(/\D/g, "").slice(0, 6))}
        />
        <Field
          label="New password"
          placeholder="At least 8 characters"
          secureTextEntry={hide}
          autoComplete="new-password"
          textContentType="newPassword"
          right={hide ? "eye-outline" : "eye-off-outline"}
          onRight={() => setHide((v) => !v)}
          value={password}
          onChangeText={setPassword}
        />
        <Field
          label="Confirm new password"
          placeholder="Re-enter your new password"
          secureTextEntry={hide}
          autoComplete="new-password"
          textContentType="newPassword"
          value={confirm}
          onChangeText={setConfirm}
        />

        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text>
        ) : null}

        <Btn
          label={submitting ? "Resetting..." : "Reset password"}
          disabled={submitting}
          onPress={handleSubmit}
        />
        <Btn
          label="Back to sign in"
          variant="ghost"
          className="mt-2"
          onPress={() => router.replace("/(auth)/sign-in")}
        />
      </Screen>
    </View>
  );
}
