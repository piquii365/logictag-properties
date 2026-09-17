import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  Btn,
  Field,
  Header,
  LoadingView,
  Screen,
  Select,
} from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { getTenants, getUnit, updateUnit } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

export default function EditUnit() {
  const { unitId } = useLocalSearchParams<{ unitId?: string }>();
  const tenantsFetch = useFetch(getTenants);

  const [label, setLabel] = useState("");
  const [floor, setFloor] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [rent, setRent] = useState("");
  const [tenantId, setTenantId] = useState<string>("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unitId) return;
    getUnit(unitId)
      .then((unit) => {
        setLabel(unit.label);
        setFloor(unit.floor ?? "");
        setBedrooms(String(unit.bedrooms));
        setRent(unit.rent ? String(unit.rent) : "");
        setTenantId(unit.tenantId ?? "");
      })
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setInitialLoading(false));
  }, [unitId]);

  const tenantOptions = useMemo(
    () => [
      { label: "None (Mark Unit Vacant)", value: "" },
      ...(tenantsFetch.data ?? []).map((t) => ({
        label: `${t.firstName} ${t.lastName} (${t.phone || t.email || "No contact"})`,
        value: t.userId ?? t.id,
      })),
    ],
    [tenantsFetch.data],
  );

  async function save() {
    if (!unitId || !label.trim()) {
      setError("Unit label is required.");
      return;
    }
    let parsedRent: number | undefined;
    if (rent.trim()) {
      parsedRent = parseFloat(rent);
      if (isNaN(parsedRent) || parsedRent < 0) {
        setError("Please enter a valid rent amount.");
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await updateUnit(unitId, {
        label: label.trim(),
        floor: floor.trim() || undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        rent: parsedRent,
        tenantId: tenantId ? tenantId : null,
      });
      router.back();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Edit Unit & Tenancy" />
      <Screen>
        {initialLoading || tenantsFetch.loading ? (
          <LoadingView />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-1">
              Unit Details
            </Text>
            <Text className="text-[13px] text-[#6B7280] mb-4">
              Update unit specification, tenant occupancy, and rent.
            </Text>

            <Field
              label="Unit label *"
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Unit 4B"
            />
            <Field
              label="Floor (Optional)"
              value={floor}
              onChangeText={setFloor}
              placeholder="e.g. 2nd Floor"
            />
            <Field
              label="Bedrooms"
              value={bedrooms}
              onChangeText={setBedrooms}
              keyboardType="number-pad"
              placeholder="e.g. 2"
            />
            <Field
              label="Monthly Rent ($)"
              value={rent}
              onChangeText={setRent}
              keyboardType="decimal-pad"
              placeholder="e.g. 500.00"
            />

            <Text className="text-[15px] font-semibold text-[#0F2C4A] mt-3 mb-1">
              Occupant & Tenancy
            </Text>
            <Text className="text-[13px] text-[#6B7280] mb-3">
              Assigning a tenant will automatically capture rent and draft a
              lease.
            </Text>

            <Select
              label="Assigned Tenant"
              options={tenantOptions}
              value={tenantId}
              onChange={setTenantId}
              placeholder="Select tenant"
            />

            {error ? (
              <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
            ) : null}

            <Btn
              label={saving ? "Saving..." : "Save Changes"}
              onPress={save}
              disabled={saving}
              className="mt-2 mb-8"
            />
          </ScrollView>
        )}
      </Screen>
    </View>
  );
}
