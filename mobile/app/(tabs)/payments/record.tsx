import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Avatar, Btn, Card, ErrorView, Field, Header, LoadingView, Screen } from "@/components/ui";
import { getLeaseTenants, getLeases, getMyUnits, getTenants } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { PaymentMethod } from "@/lib/types";

const METHODS: { label: string; value: PaymentMethod }[] = [
  { label: "Cash", value: "cash" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Mobile Money", value: "mobile_money" },
  { label: "Card", value: "card" },
];

export default function RecordPayment() {
  const { leaseId } = useLocalSearchParams<{ leaseId?: string }>();

  const tenants = useFetch(getTenants);
  const leases = useFetch(getLeases);
  const units = useFetch(getMyUnits);
  const leaseTenants = useFetch(
    () => (leaseId ? getLeaseTenants(leaseId) : Promise.resolve([])),
    [leaseId],
  );

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [pickTenant, setPickTenant] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [pickMethod, setPickMethod] = useState(false);
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Coming from an outstanding-balance row: auto-pick that lease's primary tenant.
  useEffect(() => {
    if (!leaseId || tenantId) return;
    const list = leaseTenants.data ?? [];
    const primary = list.find((t) => t.isPrimary) ?? list[0];
    if (primary) setTenantId(primary.tenantId);
  }, [leaseId, leaseTenants.data, tenantId]);

  const lease = (leases.data ?? []).find((l) => l.id === leaseId) ?? null;
  const unit = lease ? (units.data ?? []).find((u) => u.id === lease.unitId) ?? null : null;
  const selectedTenant = (tenants.data ?? []).find((t) => t.id === tenantId) ?? null;

  const loading = tenants.loading || (!!leaseId && (leases.loading || units.loading));

  const [error, setError] = useState<string | null>(null);

  async function attachProof() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to attach proof.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled) setProof(result.assets[0] ?? null);
  }

  function handleSubmit() {
    setError(null);
    const amountNumber = Number(amount);
    if (!tenantId) {
      setError("Choose which tenant this payment is for.");
      return;
    }
    if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    router.push({
      pathname: "/(tabs)/payments/confirm",
      params: {
        tenantId,
        tenantName: selectedTenant
          ? `${selectedTenant.firstName} ${selectedTenant.lastName}`
          : "Tenant",
        leaseId: leaseId ?? "",
        amount: amountNumber.toFixed(2),
        method,
        reference,
        proofUri: proof?.uri ?? "",
        proofName: proof?.fileName ?? "",
        proofType: proof?.mimeType ?? "",
      },
    });
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Record Payment" />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : tenants.error ? (
          <ErrorView message={tenants.error} onRetry={tenants.refetch} />
        ) : (
          <>
            {unit ? (
              <Card className="flex-row items-center mb-5">
                <Avatar
                  initials={(unit.tenant?.name ?? "T")
                    .slice(0, 2)
                    .toUpperCase()}
                  tint="#F96B1F"
                />
                <View className="ml-3">
                  <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                    {unit.tenant?.name ?? "Tenant"}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    {unit.label} - {unit.property?.name ?? ""}
                  </Text>
                </View>
              </Card>
            ) : (
              <>
                <Text className="text-[13px] text-[#6B7280] mb-1.5">
                  Tenant
                </Text>
                <Pressable
                  onPress={() => setPickTenant((v) => !v)}
                  className="flex-row items-center justify-between bg-white border border-[#E5E9F0] rounded-xl px-3.5 py-3.5 mb-4"
                >
                  <Text className="text-[15px] text-[#0F2C4A]">
                    {selectedTenant
                      ? `${selectedTenant.firstName} ${selectedTenant.lastName}`
                      : "Select a tenant"}
                  </Text>
                  <Ionicons
                    name={pickTenant ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#9CA3AF"
                  />
                </Pressable>
                {pickTenant ? (
                  <View className="bg-white border border-[#E5E9F0] rounded-xl -mt-2 mb-4 overflow-hidden">
                    {(tenants.data ?? []).length === 0 ? (
                      <Text className="text-[13px] text-[#6B7280] px-4 py-3">
                        No tenants on record yet.
                      </Text>
                    ) : (
                      (tenants.data ?? []).map((t) => (
                        <Pressable
                          key={t.id}
                          onPress={() => {
                            setTenantId(t.id);
                            setPickTenant(false);
                          }}
                          className="px-4 py-3 active:bg-[#F8FAFC]"
                        >
                          <Text className="text-[14px] text-[#0F2C4A]">
                            {t.firstName} {t.lastName}
                          </Text>
                        </Pressable>
                      ))
                    )}
                  </View>
                ) : null}
              </>
            )}

            <Field
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              hint="USD"
            />

            <Text className="text-[13px] text-[#6B7280] mb-1.5">
              Payment Method
            </Text>
            <Pressable
              onPress={() => setPickMethod((v) => !v)}
              className="flex-row items-center justify-between bg-white border border-[#E5E9F0] rounded-xl px-3.5 py-3.5 mb-4"
            >
              <Text className="text-[15px] text-[#0F2C4A]">
                {METHODS.find((m) => m.value === method)?.label}
              </Text>
              <Ionicons
                name={pickMethod ? "chevron-up" : "chevron-down"}
                size={18}
                color="#9CA3AF"
              />
            </Pressable>
            {pickMethod ? (
              <View className="bg-white border border-[#E5E9F0] rounded-xl -mt-2 mb-4 overflow-hidden">
                {METHODS.map((m) => (
                  <Pressable
                    key={m.value}
                    onPress={() => {
                      setMethod(m.value);
                      setPickMethod(false);
                    }}
                    className="px-4 py-3 active:bg-[#F8FAFC]"
                  >
                    <Text className="text-[14px] text-[#0F2C4A]">
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Field
              label="Reference (optional)"
              value={reference}
              onChangeText={setReference}
              autoCapitalize="characters"
            />

            <Text className="text-[13px] text-[#6B7280] mb-1.5">
              Proof of payment (optional)
            </Text>
            {proof ? (
              <View className="flex-row items-center bg-white border border-[#E5E9F0] rounded-xl p-3 mb-4">
                <Image
                  source={{ uri: proof.uri }}
                  className="h-12 w-12 rounded-lg"
                  resizeMode="cover"
                />
                <Text className="flex-1 text-[13px] text-[#0F2C4A] ml-3">
                  {proof.fileName ?? "Proof attached"}
                </Text>
                <Pressable
                  onPress={() => setProof(null)}
                  hitSlop={8}
                  className="p-1"
                >
                  <Ionicons name="close-circle" size={20} color="#DC2626" />
                </Pressable>
              </View>
            ) : (
              <Btn
                label="Attach proof of payment"
                icon="image-outline"
                variant="outline"
                onPress={attachProof}
                className="mb-4"
              />
            )}

            {error ? (
              <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text>
            ) : null}

            <Btn label="Continue" onPress={handleSubmit} />
          </>
        )}
      </Screen>
    </View>
  );
}
