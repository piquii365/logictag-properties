import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import { getUnit, updateUnit } from "@/lib/queries";

export default function EditUnit() {
  const { unitId } = useLocalSearchParams<{ unitId?: string }>();
  const [label, setLabel] = useState("");
  const [floor, setFloor] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [rent, setRent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) return;
    getUnit(unitId)
      .then((unit) => {
        setLabel(unit.label);
        setFloor(unit.floor ?? "");
        setBedrooms(String(unit.bedrooms));
        setRent(unit.rent);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load unit."),
      );
  }, [unitId]);

  async function save() {
    if (!unitId || !label.trim()) {
      setError("Unit label is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateUnit(unitId, {
        label: label.trim(),
        floor: floor.trim() || undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        rent: rent ? Number(rent) : undefined,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save unit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Edit Unit" />
      <Screen>
        <Field label="Unit label" value={label} onChangeText={setLabel} />
        <Field label="Floor" value={floor} onChangeText={setFloor} />
        <Field
          label="Bedrooms"
          value={bedrooms}
          onChangeText={setBedrooms}
          keyboardType="number-pad"
        />
        <Field
          label="Monthly rent"
          value={rent}
          onChangeText={setRent}
          keyboardType="decimal-pad"
        />
        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
        ) : null}
        <Btn
          label={saving ? "Saving..." : "Save Changes"}
          onPress={save}
          disabled={saving}
        />
      </Screen>
    </View>
  );
}
