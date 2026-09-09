import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import {
  createUtilityCharge,
  getLeases,
  getMyUnits,
  getUtilities,
} from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewUtilityCharge() {
  const { utilityId } = useLocalSearchParams<{ utilityId?: string }>();
  const utilities = useFetch(getUtilities);
  const units = useFetch(getMyUnits);
  const leases = useFetch(getLeases);
  const [unitId, setUnitId] = useState("");
  const [amount, setAmount] = useState("");
  const [periodStart, setPeriodStart] = useState(today());
  const [periodEnd, setPeriodEnd] = useState(today());
  const [dueDate, setDueDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utility = useMemo(
    () => (utilities.data ?? []).find((item) => item.id === utilityId),
    [utilities.data, utilityId],
  );
  const unit = (units.data ?? []).find((item) => item.id === unitId);
  const lease = (leases.data ?? []).find(
    (item) => item.unitId === unitId && item.status === "active",
  );

  async function save() {
    if (!utilityId || !unit?.tenantId || !unitId || !amount.trim()) {
      setError("Choose an occupied unit and enter an amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createUtilityCharge({
        tenantId: unit.tenantId,
        leaseId: lease?.id,
        unitId,
        utilityId,
        periodStart,
        periodEnd,
        dueDate,
        amountMinor: String(Math.round(Number(amount) * 100)),
      });
      router.back();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create utility charge.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Add Utility Charge" />
      <Screen>
        <Text className="text-[13px] text-[#6B7280] mb-1">Utility</Text>
        <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-4">
          {utility?.name ?? "Utility"}
        </Text>
        <Text className="text-[13px] text-[#6B7280] mb-2">Occupied unit</Text>
        <View className="gap-2 mb-4">
          {(units.data ?? [])
            .filter((item) => item.tenantId)
            .map((item) => (
              <Btn
                key={item.id}
                label={`${item.label} · ${item.tenant?.name ?? "Tenant"}`}
                variant={unitId === item.id ? "dark" : "outline"}
                onPress={() => setUnitId(item.id)}
              />
            ))}
        </View>
        <Field
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
        <Field
          label="Period start"
          value={periodStart}
          onChangeText={setPeriodStart}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Period end"
          value={periodEnd}
          onChangeText={setPeriodEnd}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Due date"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
        />
        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
        ) : null}
        <Btn
          label={saving ? "Saving..." : "Add Separate Charge"}
          onPress={save}
          disabled={saving || utilities.loading || units.loading}
        />
      </Screen>
    </View>
  );
}
