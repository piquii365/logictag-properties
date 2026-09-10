import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, Field, Header, Screen, Select } from "@/components/ui";
import { createUtility, getProperties } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

const BILLING_METHODS = ["metered", "fixed", "apportioned"] as const;

const UTILITY_TYPES = [
  { label: "Electricity", value: "electricity" },
  { label: "Water", value: "water" },
  { label: "Gas", value: "gas" },
  { label: "Sewerage", value: "sewerage" },
  { label: "Refuse / Garbage", value: "refuse" },
  { label: "Internet", value: "internet" },
  { label: "Security", value: "security" },
  { label: "Other", value: "other" },
] as const;

const APPORTION_BASIS = [
  { label: "Equal split", value: "equal" },
  { label: "By bedrooms", value: "bedrooms" },
  { label: "By floor area", value: "floor_area" },
] as const;

export default function NewUtility() {
  const { propertyId: initialPropertyId } = useLocalSearchParams<{
    propertyId?: string;
  }>();
  const properties = useFetch(getProperties);
  const [propertyId, setPropertyId] = useState(initialPropertyId ?? "");
  const [name, setName] = useState("");
  const [type, setType] = useState("electricity");
  const [billingMethod, setBillingMethod] =
    useState<(typeof BILLING_METHODS)[number]>("metered");
  const [apportionBasis, setApportionBasis] = useState("equal");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const propertyList = properties.data ?? [];

  async function save() {
    if (!propertyId || !name.trim() || !type.trim()) {
      setError("Property, utility name, and type are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createUtility({
        propertyId,
        name: name.trim(),
        type: type.trim().toLowerCase(),
        billingMethod,
        apportionBasis:
          billingMethod === "apportioned"
            ? apportionBasis.trim() || "equal"
            : undefined,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save utility.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Set Utility" />
      <Screen>
        <Text className="text-[13px] text-[#6B7280] mb-2">Property</Text>
        <View className="gap-2 mb-4">
          {propertyList.map((property) => (
            <Pressable
              key={property.id}
              onPress={() => setPropertyId(property.id)}
              className={`rounded-xl border px-4 py-3 ${propertyId === property.id ? "bg-[#0F2C4A] border-[#0F2C4A]" : "bg-white border-[#E5E9F0]"}`}
            >
              <Text
                className={`text-[14px] font-medium ${propertyId === property.id ? "text-white" : "text-[#0F2C4A]"}`}
              >
                {property.name}
              </Text>
              <Text
                className={`text-[12px] mt-0.5 ${propertyId === property.id ? "text-[#CBD5E1]" : "text-[#6B7280]"}`}
              >
                {property.address}
              </Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Utility name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Main electricity"
        />
        <Select
          label="Utility type"
          options={UTILITY_TYPES}
          value={type}
          onChange={setType}
        />
        <Text className="text-[13px] text-[#6B7280] mb-2">Billing method</Text>
        <View className="flex-row gap-2 mb-4">
          {BILLING_METHODS.map((method) => (
            <Pressable
              key={method}
              onPress={() => setBillingMethod(method)}
              className={`rounded-full border px-3 py-2 ${billingMethod === method ? "bg-[#0F2C4A] border-[#0F2C4A]" : "bg-white border-[#E5E9F0]"}`}
            >
              <Text
                className={`text-[12px] font-medium ${billingMethod === method ? "text-white" : "text-[#6B7280]"}`}
              >
                {method}
              </Text>
            </Pressable>
          ))}
        </View>
        {billingMethod === "apportioned" ? (
          <Select
            label="Apportion basis"
            options={APPORTION_BASIS}
            value={apportionBasis}
            onChange={setApportionBasis}
          />
        ) : null}
        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
        ) : null}
        <Btn
          label={saving ? "Saving..." : "Save Utility"}
          onPress={save}
          disabled={saving || properties.loading}
        />
      </Screen>
    </View>
  );
}
