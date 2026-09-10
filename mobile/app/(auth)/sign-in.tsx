import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import { authErrorMessage, useAuth } from "@/lib/auth";

export default function SignIn() {
  const { signIn, signInWithGoogle, signInWithPasskey, passkeySupported } =
    useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hide, setHide] = useState(true);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // Guard in app/_layout.tsx redirects to (tabs) once `user` is set.
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handlePasskey() {
    setError(null);
    setPasskeyBusy(true);
    try {
      // Passing the typed email lets the server offer only that account's
      // passkeys; leaving it blank falls back to a discoverable credential.
      await signInWithPasskey(email.trim() || undefined);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPasskeyBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="" />
      <Screen>
        <Text className="text-[26px] font-bold text-[#0F2C4A]">
          Welcome back
        </Text>
        <Text className="text-[14px] text-[#6B7280] mt-1 mb-6">
          Sign in to your LogicTag account
        </Text>

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          textContentType="username"
          keyboardType="email-address"
          placeholder="you@company.com"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={hide}
          autoComplete="current-password"
          textContentType="password"
          right={hide ? "eye-outline" : "eye-off-outline"}
          onRight={() => setHide((v) => !v)}
          placeholder="••••••••"
        />

        <View className="flex-row items-center justify-between mb-6">
          <Pressable
            className="flex-row items-center"
            onPress={() => setRemember((v) => !v)}
          >
            <View
              className={`h-[18px] w-[18px] rounded-[5px] items-center justify-center mr-2 ${
                remember ? "bg-[#F96B1F]" : "border border-[#CBD5E1] bg-white"
              }`}
            >
              {remember ? (
                <Ionicons name="checkmark" size={13} color="#fff" />
              ) : null}
            </View>
            <Text className="text-[13px] text-[#0F2C4A]">Remember me</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
            <Text className="text-[13px] text-[#F96B1F] font-medium">
              Forgot password?
            </Text>
          </Pressable>
        </View>

        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text>
        ) : null}

        <Btn
          label={submitting ? "Signing in..." : "Sign In"}
          disabled={submitting}
          onPress={handleSubmit}
        />

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-[#E5E9F0]" />
          <Text className="mx-3 text-[12px] text-[#6B7280]">
            or continue with
          </Text>
          <View className="flex-1 h-px bg-[#E5E9F0]" />
        </View>

        <Btn
          label={googleBusy ? "Opening Google..." : "Continue with Google"}
          variant="outline"
          icon={require("@/assets/icons/google.png")}
          className="mb-3"
          disabled={googleBusy}
          onPress={handleGoogle}
        />
        {passkeySupported ? (
          <Btn
            label={
              passkeyBusy ? "Waiting for passkey..." : "Sign in with Passkey"
            }
            variant="outline"
            icon="finger-print-outline"
            disabled={passkeyBusy}
            onPress={handlePasskey}
          />
        ) : null}

        <View className="flex-row justify-center mt-8">
          <Text className="text-[13px] text-[#6B7280]">
            Don&apos;t have an account?{" "}
          </Text>
          <Pressable onPress={() => router.push("/(auth)/select-role")}>
            <Text className="text-[13px] text-[#F96B1F] font-semibold">
              Create one
            </Text>
          </Pressable>
        </View>
      </Screen>
    </View>
  );
}
