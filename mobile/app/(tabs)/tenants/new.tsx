import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import {
  Btn,
  Field,
  Header,
  LoadingView,
  Screen,
  Select,
} from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { createTenant, getMyUnits } from "@/lib/queries";
import type { RentFrequency } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";

const FREQUENCY_OPTIONS = [
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Annually", value: "annually" },
  { label: "Weekly", value: "weekly" },
] as const;

export default function NewTenant() {
  const { unitId: initialUnitId } = useLocalSearchParams<{ unitId?: string }>();
  const units = useFetch(getMyUnits);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [unitId, setUnitId] = useState(initialUnitId ?? "");

  // Lease / rent fields
  const [rent, setRent] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [frequency, setFrequency] = useState<RentFrequency>("monthly");
  const [deposit, setDeposit] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When a unit is selected, pre-populate the rent from the unit
  useEffect(() => {
    if (unitId && units.data) {
      const selectedUnit = units.data.find((u) => u.id === unitId);
      if (selectedUnit?.rent && !rent) {
        setRent(selectedUnit.rent);
      }
    }
  }, [unitId, units.data, rent]);

  async function save() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError("Name and phone number are required.");
      return;
    }
    if (unitId && !email.trim()) {
      setError("Email is required when assigning a tenant to a unit.");
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

    let parsedDeposit: number | undefined;
    if (deposit.trim()) {
      parsedDeposit = parseFloat(deposit);
      if (isNaN(parsedDeposit) || parsedDeposit < 0) {
        setError("Please enter a valid deposit amount.");
        return;
      }
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
        rent: parsedRent,
        startDate: unitId ? startDate.trim() : undefined,
        frequency: unitId ? frequency : undefined,
        deposit: parsedDeposit,
      });

      Alert.alert(
        "Tenant Added",
        unitId
          ? "Tenant assigned, rent recorded, and draft lease created successfully."
          : "Tenant profile created successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/tenants");
              }
            },
          },
        ],
      );
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const vacantUnits = (units.data ?? []).filter(
    (unit) => unit.status === "vacant" || unit.id === initialUnitId,
  );

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Add Tenant & Assign Unit" />
      <Screen>
        {units.loading ? (
          <LoadingView />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-1">
              Tenant Information
            </Text>
            <Text className="text-[13px] text-[#6B7280] mb-4">
              Enter the tenant&apos;s contact details and assign an initial
              unit.
            </Text>

            <Field
              label="First name *"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="e.g. Tendai"
            />
            <Field
              label="Surname *"
              value={lastName}
              onChangeText={setLastName}
              placeholder="e.g. Moyo"
            />
            <Field
              label="Phone *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="e.g. +263 77 123 4567"
            />
            <Field
              label={
                unitId
                  ? "Email (Required for unit assignment) *"
                  : "Email (Optional)"
              }
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="e.g. tenant@example.com"
            />

            {/* Vacant Unit Selection */}
            <Text className="text-[15px] font-semibold text-[#0F2C4A] mt-4 mb-1">
              Assign Unit & Lease Setup
            </Text>
            <Text className="text-[13px] text-[#6B7280] mb-3">
              Assign a vacant unit to automatically draft a lease.
            </Text>

            <View className="gap-2 mb-4">
              <Pressable
                onPress={() => setUnitId("")}
                className={`rounded-xl border px-4 py-3 ${
                  unitId === ""
                    ? "bg-[#0F2C4A] border-[#0F2C4A]"
                    : "bg-white border-[#E5E9F0]"
                }`}
              >
                <Text
                  className={`text-[14px] font-medium ${
                    unitId === "" ? "text-white" : "text-[#0F2C4A]"
                  }`}
                >
                  Do not assign a unit now
                </Text>
              </Pressable>

              {vacantUnits.map((unit) => (
                <Pressable
                  key={unit.id}
                  onPress={() => {
                    setUnitId(unit.id);
                    if (unit.rent) setRent(unit.rent);
                  }}
                  className={`rounded-xl border px-4 py-3 ${
                    unitId === unit.id
                      ? "bg-[#0F2C4A] border-[#0F2C4A]"
                      : "bg-white border-[#E5E9F0]"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-[14px] font-medium ${
                        unitId === unit.id ? "text-white" : "text-[#0F2C4A]"
                      }`}
                    >
                      {unit.label}
                    </Text>
                    {unit.rent ? (
                      <Text
                        className={`text-[13px] font-semibold ${
                          unitId === unit.id ? "text-white" : "text-[#16A34A]"
                        }`}
                      >
                        ${unit.rent}/mo
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    className={`text-[12px] mt-0.5 ${
                      unitId === unit.id ? "text-[#CBD5E1]" : "text-[#6B7280]"
                    }`}
                  >
                    {unit.property?.name ?? "Property"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* If a unit is selected, show rent schedule fields */}
            {unitId ? (
              <View className="bg-white rounded-xl p-4 mb-4 border border-[#E5E9F0]">
                <Text className="text-[14px] font-semibold text-[#0F2C4A] mb-3">
                  Rent & Lease Terms
                </Text>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Field
                      label="Agreed Monthly Rent ($) *"
                      value={rent}
                      onChangeText={setRent}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 500.00"
                    />
                  </View>
                  <View className="flex-1">
                    <Field
                      label="Start Date *"
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Select
                      label="Payment Frequency"
                      options={FREQUENCY_OPTIONS}
                      value={frequency}
                      onChange={(v) => setFrequency(v as RentFrequency)}
                    />
                  </View>
                  <View className="flex-1">
                    <Field
                      label="Deposit ($)"
                      value={deposit}
                      onChangeText={setDeposit}
                      keyboardType="decimal-pad"
                      placeholder="e.g. 500.00"
                    />
                  </View>
                </View>
              </View>
            ) : null}

            {error ? (
              <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
            ) : null}

            <Btn
              label={
                saving
                  ? "Saving..."
                  : unitId
                    ? "Assign Unit & Start Lease"
                    : "Add Tenant Profile"
              }
              onPress={save}
              disabled={saving}
              className="mb-8"
            />
          </ScrollView>
        )}
      </Screen>
    </View>
  );
}
