import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import {
  Btn,
  Field,
  Header,
  LoadingView,
  Screen,
  Select,
} from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import {
  activateLease,
  createLease,
  getMyUnits,
  getTenants,
} from "@/lib/queries";
import type { RentFrequency } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";

const FREQUENCY_OPTIONS = [
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Annually", value: "annually" },
  { label: "Weekly", value: "weekly" },
] as const;

const CURRENCY_OPTIONS = [
  { label: "USD ($)", value: "USD" },
  { label: "ZWG (ZiG)", value: "ZWG" },
] as const;

export default function CreateLease() {
  const params = useLocalSearchParams<{ unitId?: string; tenantId?: string }>();

  const unitsFetch = useFetch(getMyUnits);
  const tenantsFetch = useFetch(getTenants);

  const units = unitsFetch.data ?? [];
  const tenants = tenantsFetch.data ?? [];

  const [unitId, setUnitId] = useState(params.unitId ?? "");
  const [tenantId, setTenantId] = useState(params.tenantId ?? "");
  const [reference, setReference] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [frequency, setFrequency] = useState<RentFrequency>("monthly");
  const [rentDueDay, setRentDueDay] = useState("1");
  const [deposit, setDeposit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-select unit and tenant if passed in params or when units load
  useEffect(() => {
    if (params.unitId && !unitId) {
      setUnitId(params.unitId);
    }
  }, [params.unitId, unitId]);

  // If a unit is selected, pre-populate the tenant if that unit already has an occupant
  useEffect(() => {
    if (unitId && !tenantId) {
      const selectedUnit = units.find((u) => u.id === unitId);
      if (selectedUnit?.tenantId) {
        setTenantId(selectedUnit.tenantId);
      }
    }
  }, [unitId, tenantId, units]);

  const unitOptions = useMemo(
    () =>
      units.map((u) => ({
        label: `${u.property?.name ?? "Property"} · ${u.label}`,
        value: u.id,
      })),
    [units],
  );

  const tenantOptions = useMemo(
    () => [
      { label: "None (Draft without tenant)", value: "" },
      ...tenants.map((t) => ({
        label: `${t.firstName} ${t.lastName} (${t.phone || t.email || "No contact"})`,
        value: t.id,
      })),
    ],
    [tenants],
  );

  async function handleSave(andActivate = false) {
    setError(null);
    if (!unitId) {
      setError("Please select a unit for this lease.");
      return;
    }
    if (!startDate.trim()) {
      setError("Please specify a valid start date (YYYY-MM-DD).");
      return;
    }
    const numRent = parseFloat(rentAmount);
    if (isNaN(numRent) || numRent <= 0) {
      setError("Please enter a valid rent amount.");
      return;
    }

    const rentAmountMinor = Math.round(numRent * 100).toString();
    const depositNum = parseFloat(deposit);
    const depositMinor =
      !isNaN(depositNum) && depositNum > 0
        ? Math.round(depositNum * 100).toString()
        : undefined;

    const dueDayNum = parseInt(rentDueDay, 10);
    const validDueDay =
      !isNaN(dueDayNum) && dueDayNum >= 1 && dueDayNum <= 31 ? dueDayNum : 1;

    setSubmitting(true);
    try {
      const lease = await createLease({
        unitId,
        reference: reference.trim() || undefined,
        startDate: startDate.trim(),
        endDate: endDate.trim() || undefined,
        rentAmountMinor,
        currency,
        frequency,
        rentDueDay: validDueDay,
        depositMinor,
        tenantId: tenantId || undefined,
      });

      if (andActivate) {
        await activateLease(lease.id);
      }

      Alert.alert(
        andActivate ? "Lease Activated" : "Lease Drafted",
        andActivate
          ? "The lease has been drafted and activated."
          : "The lease draft has been saved successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/leases");
              }
            },
          },
        ],
      );
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const loading = unitsFetch.loading || tenantsFetch.loading;

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Draft Lease" />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-1">
              Lease Agreement
            </Text>
            <Text className="text-[13px] text-[#6B7280] mb-5">
              Set up lease terms, rent schedule, and assign a tenant.
            </Text>

            {/* Unit Picker */}
            <Select
              label="Property & Unit *"
              options={unitOptions}
              value={unitId}
              onChange={setUnitId}
              placeholder="Select property and unit"
            />

            {/* Tenant Picker */}
            <Select
              label="Tenant (Optional)"
              options={tenantOptions}
              value={tenantId}
              onChange={setTenantId}
              placeholder="Assign tenant (optional for draft)"
            />

            {/* Reference */}
            <Field
              label="Lease Reference (Optional)"
              value={reference}
              onChangeText={setReference}
              placeholder="e.g. LSE-2026-001 (auto if blank)"
            />

            {/* Dates */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label="Start Date *"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View className="flex-1">
                <Field
                  label="End Date (Optional)"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  hint="Blank = Month-to-month"
                />
              </View>
            </View>

            {/* Rent Amount & Currency */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label="Rent Amount *"
                  value={rentAmount}
                  onChangeText={setRentAmount}
                  keyboardType="decimal-pad"
                  placeholder="500.00"
                />
              </View>
              <View className="w-[120px]">
                <Select
                  label="Currency"
                  options={CURRENCY_OPTIONS}
                  value={currency}
                  onChange={setCurrency}
                />
              </View>
            </View>

            {/* Frequency & Due Day */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Select
                  label="Payment Frequency"
                  options={FREQUENCY_OPTIONS}
                  value={frequency}
                  onChange={(v) => setFrequency(v as RentFrequency)}
                />
              </View>
              <View className="w-[120px]">
                <Field
                  label="Due Day"
                  value={rentDueDay}
                  onChangeText={setRentDueDay}
                  keyboardType="number-pad"
                  placeholder="1"
                  hint="Day 1-31"
                />
              </View>
            </View>

            {/* Security Deposit */}
            <Field
              label="Security Deposit (Optional)"
              value={deposit}
              onChangeText={setDeposit}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            {error ? (
              <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text>
            ) : null}

            {/* Actions */}
            <Btn
              label={submitting ? "Saving Draft..." : "Save Draft Lease"}
              disabled={submitting}
              onPress={() => handleSave(false)}
              className="mt-2 mb-3"
            />

            <Btn
              label={submitting ? "Activating..." : "Save & Activate Lease"}
              variant="outline"
              disabled={submitting}
              onPress={() => handleSave(true)}
              className="mb-8"
            />
          </ScrollView>
        )}
      </Screen>
    </View>
  );
}
