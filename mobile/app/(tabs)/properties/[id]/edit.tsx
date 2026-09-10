import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Btn, Field, Header, Screen, Select } from "@/components/ui";
import { ZIMBABWE_CITIES } from "@/lib/data";
import {
  getProperty,
  updateProperty,
  uploadPropertyImage,
} from "@/lib/queries";

const BASE_CITY_OPTIONS = ZIMBABWE_CITIES.map((city) => ({
  label: city,
  value: city,
}));

export default function EditProperty() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Include the property's existing city even if it isn't in the standard list,
  // so editing never silently drops a previously-saved custom value.
  const cityOptions = useMemo(() => {
    if (city && !BASE_CITY_OPTIONS.some((o) => o.value === city)) {
      return [{ label: city, value: city }, ...BASE_CITY_OPTIONS];
    }
    return BASE_CITY_OPTIONS;
  }, [city]);

  useEffect(() => {
    if (!id) return;
    getProperty(id)
      .then((property) => {
        setName(property.name);
        setAddress(property.address);
        setCity(property.city ?? "");
      })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Could not load property.",
        ),
      );
  }, [id]);

  async function save() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await updateProperty(id, {
        name: name.trim(),
        address: address.trim(),
        city: city.trim() || undefined,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save property.");
    } finally {
      setBusy(false);
    }
  }

  async function addImage() {
    if (!id) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setBusy(true);
    setError(null);
    try {
      await uploadPropertyImage(id, {
        uri: asset.uri,
        name: asset.fileName ?? `property-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Edit Property" />
      <Screen>
        <Field label="Property name" value={name} onChangeText={setName} />
        <Field label="Address" value={address} onChangeText={setAddress} />
        <Select
          label="City"
          options={cityOptions}
          value={city}
          onChange={setCity}
          placeholder="Select a city"
        />
        <Btn
          label="Add Image"
          icon="image-outline"
          variant="outline"
          onPress={addImage}
          disabled={busy}
          className="mb-3"
        />
        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
        ) : null}
        <Btn
          label={busy ? "Saving..." : "Save Changes"}
          onPress={save}
          disabled={busy}
        />
      </Screen>
    </View>
  );
}
