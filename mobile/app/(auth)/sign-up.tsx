import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import { authErrorMessage, useAuth } from "@/lib/auth";
import { roleLabel, type UserRole } from "@/lib/roles";

export default function SignUp() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { signUp } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [hide, setHide] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No role means this screen was reached directly rather than via the
  // role picker — send them there first instead of guessing a role.
  useEffect(() => {
    if (!role) router.replace("/(auth)/select-role");
  }, [role]);

  if (!role) return null;

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in your name, email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        role: role as UserRole,
      });
      // Guard in app/_layout.tsx redirects to (tabs) once `user` is set.
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
        <Text className="text-[26px] font-bold text-[#0F2C4A]">Create account</Text>
        <Text className="text-[14px] text-[#6B7280] mt-1 mb-1">
          Signing up as {roleLabel(role as UserRole)}
        </Text>
        <Pressable className="mb-5" onPress={() => router.back()}>
          <Text className="text-[13px] text-[#F96B1F] font-medium">Change role</Text>
        </Pressable>

        <Field label="Full name" placeholder="John Moyo" value={name} onChangeText={setName} />
        <Field
          label="Email"
          placeholder="you@company.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Phone"
          placeholder="+263 77 123 4567"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <Field
          label="Password"
          placeholder="At least 8 characters"
          secureTextEntry={hide}
          right={hide ? "eye-outline" : "eye-off-outline"}
          onRight={() => setHide((v) => !v)}
          hint="Use 8+ characters with a number and a symbol."
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text> : null}

        <Btn
          label={submitting ? "Creating account..." : "Create Account"}
          className="mt-2"
          disabled={submitting}
          onPress={handleSubmit}
        />

        <Text className="text-[12px] text-[#6B7280] text-center mt-4 leading-5">
          By creating an account you agree to the Terms of Service and Privacy Policy.
        </Text>

        <View className="flex-row justify-center mt-8">
          <Text className="text-[13px] text-[#6B7280]">Already have an account? </Text>
          <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
            <Text className="text-[13px] text-[#F96B1F] font-semibold">Sign in</Text>
          </Pressable>
        </View>
      </Screen>
    </View>
  );
}
