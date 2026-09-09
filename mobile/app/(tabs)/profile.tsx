import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
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
  const { user, refreshProfile } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
              <Avatar initials={initialsOf(user.name).toUpperCase()} size={84} />
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
          <Text className="text-[12px] text-[#6B7280]">Email</Text>
          <Text className="text-[14px] text-[#0F2C4A] font-medium mt-0.5">{user.email}</Text>
          <Text className="text-[12px] text-[#6B7280] mt-3">Role</Text>
          <Text className="text-[14px] text-[#0F2C4A] font-medium mt-0.5">{roleLabel(user.role)}</Text>
        </Card>

        <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+263 77 123 4567"
          keyboardType="phone-pad"
        />

        {error ? <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text> : null}
        {saved ? <Text className="text-[13px] text-[#16A34A] mb-4">Profile updated.</Text> : null}

        <Btn
          label={savingProfile ? "Saving..." : "Save Changes"}
          disabled={savingProfile}
          onPress={handleSave}
        />
      </Screen>
    </View>
  );
}
