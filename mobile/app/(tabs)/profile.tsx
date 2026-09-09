import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { Avatar, Btn, Card, Field, Header, Screen } from "@/components/ui";
import { apiErrorMessage, BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";
import { updateProfile, uploadAvatar } from "@/lib/queries";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "");
}

export default function Profile() {
  const { user, refreshProfile, requestEmailChange, confirmEmailChange } =
    useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Email change flow: request a code, then confirm it.
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  if (!user) return null;

  const handlePickAvatar = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(user.id, {
        uri: asset.uri,
        name: asset.fileName ?? "avatar.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });
      setAvatarUrl(updated.avatarUrl);
      await refreshProfile();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile(user.id, { name: name.trim(), phone: phone.trim() || undefined });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRequestEmailChange = async () => {
    setEmailError(null);
    const email = newEmail.trim();
    if (!email) {
      setEmailError("Enter your new email address.");
      return;
    }
    if (email.toLowerCase() === user.email.toLowerCase()) {
      setEmailError("That's your current email. Enter a different one.");
      return;
    }
    setEmailBusy(true);
    try {
      const message = await requestEmailChange(email);
      setAwaitingCode(true);
      Alert.alert("Check your inbox", message);
    } catch (err) {
      setEmailError(apiErrorMessage(err));
    } finally {
      setEmailBusy(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    setEmailError(null);
    if (!code.trim()) {
      setEmailError("Enter the confirmation code from your email.");
      return;
    }
    setEmailBusy(true);
    try {
      const newEmailAddress = await confirmEmailChange(code.trim());
      await refreshProfile();
      setEditingEmail(false);
      setAwaitingCode(false);
      setNewEmail("");
      setCode("");
      Alert.alert("Email updated", `Your email is now ${newEmailAddress}.`);
    } catch (err) {
      setEmailError(apiErrorMessage(err));
    } finally {
      setEmailBusy(false);
    }
  };

  const cancelEmailChange = () => {
    setEditingEmail(false);
    setAwaitingCode(false);
    setNewEmail("");
    setCode("");
    setEmailError(null);
  };

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Profile" />
      <Screen>
        <View className="items-center mb-6">
          <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
            {avatarUrl ? (
              <Image
                source={{ uri: `${BASE_URL}${avatarUrl}` }}
                style={{ width: 84, height: 84, borderRadius: 42 }}
              />
            ) : (
              <Avatar
                initials={initialsOf(user.name).toUpperCase()}
                size={84}
              />
            )}
            <View className="absolute -right-1 -bottom-1 h-7 w-7 rounded-full bg-[#F96B1F] items-center justify-center border-2 border-[#F4F6F9]">
              <Text className="text-white text-[13px]">✎</Text>
            </View>
          </Pressable>
          <Text className="text-[12px] text-[#6B7280] mt-2">
            {uploadingAvatar ? "Uploading..." : "Tap to change photo"}
          </Text>
        </View>

        <Card className="mb-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-[12px] text-[#6B7280]">Email</Text>
              <Text className="text-[14px] text-[#0F2C4A] font-medium mt-0.5">
                {user.email}
              </Text>
            </View>
            {!editingEmail ? (
              <Btn
                label="Change"
                variant="ghost"
                className="py-1 px-2"
                onPress={() => {
                  setEditingEmail(true);
                  setEmailError(null);
                }}
              />
            ) : null}
          </View>

          {editingEmail ? (
            <View className="mt-3 border-t border-[#E5E9F0] pt-3">
              {!awaitingCode ? (
                <>
                  <Field
                    label="New email"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                  <Text className="text-[12px] text-[#6B7280] -mt-2 mb-3 leading-4">
                    We'll send a confirmation code to the new address. Your
                    email only changes once you confirm it.
                  </Text>
                  {emailError ? (
                    <Text className="text-[13px] text-[#DC2626] mb-3">
                      {emailError}
                    </Text>
                  ) : null}
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Btn
                        label={emailBusy ? "Sending..." : "Send code"}
                        disabled={emailBusy}
                        onPress={handleRequestEmailChange}
                      />
                    </View>
                    <Btn
                      label="Cancel"
                      variant="outline"
                      onPress={cancelEmailChange}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text className="text-[13px] text-[#0F2C4A] font-medium mb-1">
                    Enter the confirmation code
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mb-3 leading-4">
                    We sent a code to {newEmail.trim() || "your new email"}.
                    Paste it below to finish the change.
                  </Text>
                  <Field
                    label="Confirmation code"
                    value={code}
                    onChangeText={setCode}
                    placeholder="Paste the code from your email"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {emailError ? (
                    <Text className="text-[13px] text-[#DC2626] mb-3">
                      {emailError}
                    </Text>
                  ) : null}
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Btn
                        label={emailBusy ? "Confirming..." : "Confirm email"}
                        disabled={emailBusy}
                        onPress={handleConfirmEmailChange}
                      />
                    </View>
                    <Btn
                      label="Cancel"
                      variant="outline"
                      onPress={cancelEmailChange}
                    />
                  </View>
                </>
              )}
            </View>
          ) : null}

          <Text className="text-[12px] text-[#6B7280] mt-3">Role</Text>
          <Text className="text-[14px] text-[#0F2C4A] font-medium mt-0.5">
            {roleLabel(user.role)}
          </Text>
        </Card>

        <Field
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
        />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+263 77 123 4567"
          keyboardType="phone-pad"
        />

        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text>
        ) : null}
        {saved ? (
          <Text className="text-[13px] text-[#16A34A] mb-4">
            Profile updated.
          </Text>
        ) : null}

        <Btn
          label={savingProfile ? "Saving..." : "Save Changes"}
          disabled={savingProfile}
          onPress={handleSave}
        />
      </Screen>
    </View>
  );
}
