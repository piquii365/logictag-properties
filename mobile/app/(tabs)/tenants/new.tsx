import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import { createTenant, getMyUnits } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

export default function NewTenant() {
  const { unitId: initialUnitId } = useLocalSearchParams<{ unitId?: string }>();
  const units = useFetch(getMyUnits);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [unitId, setUnitId] = useState(initialUnitId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError("Name and phone are required.");
      return;
    }
    if (unitId && !email.trim()) {
      setError("Email is required when assigning a tenant to a unit.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTenant({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        unitId: unitId || undefined,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add tenant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Add Tenant" />
      <Screen>
        <Field
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
        />
        <Field label="Surname" value={lastName} onChangeText={setLastName} />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text className="text-[13px] text-[#6B7280] mb-2">
          Assign vacant unit (optional)
        </Text>
        <View className="gap-2 mb-4">
          {(units.data ?? [])
            .filter((unit) => unit.status === "vacant")
            .map((unit) => (
              <Pressable
                key={unit.id}
                onPress={() => setUnitId(unit.id)}
                className={`rounded-xl border px-4 py-3 ${unitId === unit.id ? "bg-[#0F2C4A] border-[#0F2C4A]" : "bg-white border-[#E5E9F0]"}`}
              >
                <Text
                  className={`text-[14px] font-medium ${unitId === unit.id ? "text-white" : "text-[#0F2C4A]"}`}
                >
                  {unit.label}
                </Text>
                <Text
                  className={`text-[12px] mt-0.5 ${unitId === unit.id ? "text-[#CBD5E1]" : "text-[#6B7280]"}`}
                >
                  {unit.property?.name ?? "Property"}
                </Text>
              </Pressable>
            ))}
        </View>
        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
        ) : null}
        <Btn
          label={saving ? "Saving..." : "Add Tenant"}
          onPress={save}
          disabled={saving || units.loading}
        />
      </Screen>
    </View>
  );
}
