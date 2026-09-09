import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import { createProperty, uploadPropertyImage } from "@/lib/queries";

export default function NewProperty() {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function chooseImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (!result.canceled) setImage(result.assets[0] ?? null);
  }

  async function save() {
    if (!name.trim() || !address.trim())
      return setError("Name and address are required.");
    setSaving(true);
    setError(null);
    try {
      const property = await createProperty({
        name: name.trim(),
        address: address.trim(),
        city: city.trim() || undefined,
      });
      if (image) {
        await uploadPropertyImage(property.id, {
          uri: image.uri,
          name: image.fileName ?? `property-${Date.now()}.jpg`,
          type: image.mimeType ?? "image/jpeg",
        });
      }
      router.replace({
        pathname: "/(tabs)/properties/[id]",
        params: { id: property.id },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create property.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Add Property" />
      <Screen>
        <Field
          label="Property name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Riverside Apartments"
        />
        <Field
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Street address"
        />
        <Field
          label="City"
          value={city}
          onChangeText={setCity}
          placeholder="City"
        />
        <Btn
          label={image ? "Image selected" : "Add property image (optional)"}
          icon="image-outline"
          variant="outline"
          onPress={chooseImage}
          disabled={saving}
          className="mb-3"
        />
        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
        ) : null}
        <Btn
          label={saving ? "Saving..." : "Create Property"}
          onPress={save}
          disabled={saving}
        />
      </Screen>
    </View>
  );
}
