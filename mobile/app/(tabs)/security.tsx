import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { useAuth, type PasskeySummary } from "@/lib/auth";
import { changePassword } from "@/lib/queries";

export default function Security() {
  // ── Change password ──────────────────────────────────────────────────────────
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

  // ── Passkey management ───────────────────────────────────────────────────────
  const {
    passkeySupported,
    passkeyStatus,
    registerPasskey,
    listPasskeys,
    removePasskey,
  } = useAuth();

  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  const fetchPasskeys = useCallback(async () => {
    setLoadingPasskeys(true);
    setPasskeyError(null);
    try {
      setPasskeys(await listPasskeys());
    } catch (err) {
      setPasskeyError(apiErrorMessage(err));
    } finally {
      setLoadingPasskeys(false);
    }
  }, [listPasskeys]);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  async function handleAddPasskey() {
    setPasskeyError(null);
    setRegistering(true);
    try {
      // Run the native ceremony first, then ask for a friendly name.
      const summary = await registerPasskey();

      // Prompt for an optional device label after the ceremony succeeds.
      Alert.prompt(
        "Name this passkey",
        "Give it a short name so you can identify it later (optional).",
        async (deviceName) => {
          if (deviceName?.trim()) {
            // If the user provided a name we need to re-register with the name.
            // The ceremony already succeeded — we just patch the name locally
            // for display since the server already saved the credential.
            // Re-run only if you want the name stored server-side from the start;
            // here we refresh the list which will show the server-stored name.
            void deviceName; // name was already sent when undefined, show the refresh.
          }
          await fetchPasskeys();
        },
        "plain-text",
      );

      // Immediately refresh if Alert.prompt is unavailable (Android).
      setPasskeys((prev) => [summary, ...prev]);
    } catch (err) {
      setPasskeyError(apiErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  }

  async function handleAddPasskeyWithName() {
    setPasskeyError(null);
    setRegistering(true);
    try {
      const summary = await registerPasskey();
      setPasskeys((prev) => [summary, ...prev]);
    } catch (err) {
      setPasskeyError(apiErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  }

  async function handleRemove(id: string, label: string) {
    Alert.alert(
      "Remove passkey",
      `Remove "${label}"? You won't be able to sign in with it any more.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removePasskey(id);
              setPasskeys((prev) => prev.filter((p) => p.id !== id));
            } catch (err) {
              setPasskeyError(apiErrorMessage(err));
            }
          },
        },
      ],
    );
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Security" />
      <Screen>
        {/* ── Change password ──────────────────────────────────────── */}
        <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-1">
          Change password
        </Text>
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

        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text>
        ) : null}
        {success ? (
          <Text className="text-[13px] text-[#16A34A] mb-4">
            Password changed.
          </Text>
        ) : null}

        <Btn
          label={submitting ? "Changing..." : "Change Password"}
          disabled={submitting}
          onPress={handleSubmit}
        />

        {/* ── Divider ──────────────────────────────────────────────── */}
        <View className="flex-row items-center my-7">
          <View className="flex-1 h-px bg-[#E5E9F0]" />
        </View>

        {/* ── Passkeys ─────────────────────────────────────────────── */}
        <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-1">
          Passkeys
        </Text>
        <Text className="text-[13px] text-[#6B7280] mb-5">
          Sign in with Face ID, fingerprint or device PIN — no password needed.
        </Text>

        {passkeyError ? (
          <Text className="text-[13px] text-[#DC2626] mb-4">
            {passkeyError}
          </Text>
        ) : null}

        {!passkeySupported ? (
          <View className="bg-white rounded-xl p-4 mb-4 border border-[#E5E9F0]">
            {passkeyStatus?.isExpoGo ? (
              <>
                <View className="flex-row items-center mb-2">
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#F96B1F"
                  />
                  <Text className="text-[14px] font-semibold text-[#0F2C4A] ml-2">
                    Expo Go Notice
                  </Text>
                </View>
                <Text className="text-[13px] text-[#6B7280] leading-5 mb-2">
                  Your device supports biometrics, but you are currently running
                  the app in{" "}
                  <Text className="font-semibold text-[#0F2C4A]">Expo Go</Text>.
                  Custom native modules like passkeys cannot run inside Expo Go.
                </Text>
                <Text className="text-[12px] text-[#6B7280] leading-5 font-medium">
                  To test native passkeys on Android:
                </Text>
                <View className="bg-[#F4F6F9] rounded-lg p-2.5 my-2 border border-[#E5E9F0]">
                  <Text className="text-[12px] font-mono text-[#0F2C4A]">
                    npx expo run:android
                  </Text>
                </View>
                <Text className="text-[12px] text-[#6B7280] leading-5">
                  Or test passkeys in Chrome on this Android phone right now:
                </Text>
                <View className="bg-[#F4F6F9] rounded-lg p-2.5 mt-1 border border-[#E5E9F0]">
                  <Text className="text-[12px] font-mono text-[#0F2C4A]">
                    npx expo start --web
                  </Text>
                </View>
              </>
            ) : (
              <Text className="text-[13px] text-[#6B7280] text-center">
                {passkeyStatus?.reason ??
                  "Passkeys aren't supported on this device or platform."}
              </Text>
            )}
          </View>
        ) : (
          <>
            {/* Registered passkeys list */}
            {loadingPasskeys ? (
              <Text className="text-[13px] text-[#6B7280] mb-4">
                Loading passkeys…
              </Text>
            ) : passkeys.length === 0 ? (
              <View className="bg-white rounded-xl px-4 py-4 mb-4 border border-[#E5E9F0]">
                <Text className="text-[13px] text-[#6B7280] text-center">
                  No passkeys registered yet.
                </Text>
              </View>
            ) : (
              <View className="mb-4 rounded-xl overflow-hidden border border-[#E5E9F0]">
                {passkeys.map((pk, idx) => (
                  <View
                    key={pk.id}
                    className={`flex-row items-center px-4 py-3 bg-white ${
                      idx < passkeys.length - 1
                        ? "border-b border-[#F0F2F6]"
                        : ""
                    }`}
                  >
                    <Ionicons
                      name="finger-print-outline"
                      size={20}
                      color="#0F2C4A"
                    />
                    <View className="flex-1 ml-3">
                      <Text className="text-[14px] font-medium text-[#0F2C4A]">
                        {pk.deviceName ?? "Passkey"}
                      </Text>
                      <Text className="text-[12px] text-[#6B7280]">
                        Added {formatDate(pk.createdAt)}
                        {pk.lastUsedAt
                          ? `  ·  Last used ${formatDate(pk.lastUsedAt)}`
                          : ""}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={12}
                      onPress={() =>
                        handleRemove(pk.id, pk.deviceName ?? "Passkey")
                      }
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#DC2626"
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Add passkey button */}
            <Btn
              label={registering ? "Waiting for authenticator…" : "Add Passkey"}
              variant="outline"
              icon="finger-print-outline"
              disabled={registering}
              onPress={handleAddPasskeyWithName}
            />
          </>
        )}
      </Screen>
    </View>
  );
}
