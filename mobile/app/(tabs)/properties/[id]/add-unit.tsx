import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import { createUnit } from "@/lib/queries";

export default function AddUnit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [label, setLabel] = useState("");
  const [floor, setFloor] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [rent, setRent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!id || !label.trim()) return setError("Unit label is required.");
    setSaving(true);
    setError(null);
    try {
      await createUnit(id, {
        label: label.trim(),
        floor: floor.trim() || undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        rent: rent ? Number(rent) : undefined,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add unit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Add Unit" />
      <Screen>
        <Field
          label="Unit label"
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. Unit 1A"
        />
        <Field
          label="Floor"
          value={floor}
          onChangeText={setFloor}
          placeholder="e.g. Ground floor"
        />
        <Field
          label="Bedrooms"
          value={bedrooms}
          onChangeText={setBedrooms}
          keyboardType="number-pad"
          placeholder="0"
        />
        <Field
          label="Monthly rent"
          value={rent}
          onChangeText={setRent}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
        ) : null}
        <Btn
          label={saving ? "Saving..." : "Add Unit"}
          onPress={save}
          disabled={saving}
        />
      </Screen>
    </View>
  );
}
