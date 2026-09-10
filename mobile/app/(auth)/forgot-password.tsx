import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import { authErrorMessage, useAuth } from "@/lib/auth";

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setSubmitting(true);
    try {
      await forgotPassword(email.trim());
      router.push({ pathname: "/(auth)/reset-password", params: { email: email.trim() } });
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
          Reset password
        </Text>
        <Text className="text-[14px] text-[#6B7280] mt-1 mb-6 leading-5">
          Enter the email on your account and we&apos;ll send you a reset link.
        </Text>

        <Field
          label="Email"
          placeholder="you@company.com"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text>
        ) : null}

        <Btn
          label={submitting ? "Sending..." : "Send reset link"}
          disabled={submitting}
          onPress={handleSubmit}
        />
        <Btn
          label="Back to sign in"
          variant="ghost"
          className="mt-2"
          onPress={() => router.back()}
        />
      </Screen>
    </View>
  );
}
