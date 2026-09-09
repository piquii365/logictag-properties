import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Card,
  Divider,
  ErrorView,
  Header,
  LoadingView,
  Row,
  Screen,
  SectionTitle,
  StatusText,
} from "@/components/ui";
import { apiErrorMessage, BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { centsToDollars, money } from "@/lib/data";
import {
  getLeases,
  getMyUnits,
  getPayments,
  getRentCharges,
  uploadPaymentProof,
} from "@/lib/queries";
import { isManagementRole, isTenant } from "@/lib/roles";
import { useFetch } from "@/lib/useFetch";
import type { Lease, Payment, RentCharge, Unit } from "@/lib/types";

const OUTSTANDING_STATUSES = new Set(["outstanding", "part_paid"]);

export default function Payments() {
  const { user } = useAuth();
  const isManagement = isManagementRole(user?.role);
  const isTenantUser = isTenant(user?.role);
  // Vendors have no units/leases/charges — only fetch their (empty) payments.
  const isVendorUser = user?.role === "vendor";

  const units = useFetch(() =>
    isVendorUser ? Promise.resolve([]) : getMyUnits(),
  );
  const leases = useFetch(() =>
    isVendorUser ? Promise.resolve([]) : getLeases(),
  );
  const rentCharges = useFetch(() =>
    isVendorUser ? Promise.resolve([]) : getRentCharges(),
  );
  const payments = useFetch(getPayments);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loading =
    units.loading || leases.loading || rentCharges.loading || payments.loading;
  const error =
    units.error ?? leases.error ?? rentCharges.error ?? payments.error;

  const unitByLease = useMemo(() => {
    const unitsById = new Map((units.data ?? []).map((u) => [u.id, u]));
    const map = new Map<string, Unit>();
    for (const l of leases.data ?? []) {
      const u = unitsById.get(l.unitId);
      if (u) map.set(l.id, u);
    }
    return map;
  }, [leases.data, units.data]);

  const outstandingByLease = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of rentCharges.data ?? []) {
      if (!OUTSTANDING_STATUSES.has(c.status)) continue;
      const owed = Number(c.amountMinor) - Number(c.allocatedMinor);
      if (owed <= 0) continue;
      map.set(c.leaseId, (map.get(c.leaseId) ?? 0) + owed);
    }
    return map;
  }, [rentCharges.data]);

  const collected = centsToDollars(
    (rentCharges.data ?? []).reduce((s, c) => s + Number(c.allocatedMinor), 0),
  );
  const outstanding = centsToDollars(
    [...outstandingByLease.values()].reduce((s, v) => s + v, 0),
  );

  const recent = [...(payments.data ?? [])]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 10);

  async function uploadProof(paymentId: string) {
    setActionError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setActionError("Photo library access is needed to upload proof.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingId(paymentId);
    try {
      await uploadPaymentProof(paymentId, {
        uri: asset.uri,
        name: asset.fileName ?? "proof.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });
      await payments.refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setUploadingId(null);
    }
  }

  async function openProof(url: string) {
    await WebBrowser.openBrowserAsync(`${BASE_URL}${url}`);
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header
        title="Payments"
        back={false}
        right="notifications-outline"
        badge
      />
      <Screen>
        {!isManagement ? (
          <PersonalPaymentsView
            loading={loading}
            error={error}
            isTenantUser={isTenantUser}
            leases={leases.data ?? []}
            units={units.data ?? []}
            rentCharges={rentCharges.data ?? []}
            payments={payments.data ?? []}
            uploadingId={uploadingId}
            actionError={actionError}
            onUploadProof={uploadProof}
            onOpenProof={openProof}
            onRetry={() => {
              units.refetch();
              leases.refetch();
              rentCharges.refetch();
              payments.refetch();
            }}
          />
        ) : loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              units.refetch();
              leases.refetch();
              rentCharges.refetch();
              payments.refetch();
            }}
          />
        ) : (
          <>
            <Card>
              <View className="flex-row">
                <View className="flex-1">
                  <Text className="text-[12px] text-[#6B7280] mb-1">
                    Collected
                  </Text>
                  <Text className="text-[22px] font-bold text-[#16A34A]">
                    {money(collected)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-[#6B7280] mb-1">
                    Outstanding
                  </Text>
                  <Text className="text-[22px] font-bold text-[#DC2626]">
                    {money(outstanding)}
                  </Text>
                </View>
              </View>
            </Card>

            <SectionTitle>Actions</SectionTitle>
            <View className="rounded-2xl border border-[#E5E9F0] overflow-hidden">
              <Row
                icon="add-circle-outline"
                iconTint="#F96B1F"
                title="Record Payment"
                sub="Log a payment received from a tenant"
                onPress={() => router.push("/(tabs)/payments/record")}
              />
              <Divider />
              <Row
                icon="card-outline"
                iconTint="#F96B1F"
                title="Pay Rent"
                sub="Tenant self-service payment"
                onPress={() => router.push("/(tabs)/payments/pay-rent")}
              />
            </View>

            <SectionTitle>Outstanding balances</SectionTitle>
            <View className="rounded-2xl border border-[#E5E9F0] overflow-hidden">
              {[...outstandingByLease.entries()].length === 0 ? (
                <Text className="text-center text-[13px] text-[#6B7280] py-6 bg-white">
                  Nothing outstanding.
                </Text>
              ) : (
                [...outstandingByLease.entries()].map(
                  ([leaseId, owedMinor], i) => {
                    const unit = unitByLease.get(leaseId);
                    return (
                      <View key={leaseId}>
                        {i ? <Divider /> : null}
                        <Row
                          title={`${unit?.tenant?.name ?? "Tenant"} - ${unit?.label ?? ""}`}
                          sub={unit?.property?.name ?? ""}
                          right={
                            <StatusText
                              text={`${money(centsToDollars(owedMinor))} due`}
                              tone="red"
                            />
                          }
                          chevron={false}
                          onPress={() =>
                            router.push({
                              pathname: "/(tabs)/payments/record",
                              params: { leaseId },
                            })
                          }
                        />
                      </View>
                    );
                  },
                )
              )}
            </View>

            <SectionTitle>Recent transactions</SectionTitle>
            {actionError ? (
              <Text className="text-[13px] text-[#DC2626] mb-2">
                {actionError}
              </Text>
            ) : null}
            <View className="rounded-2xl border border-[#E5E9F0] overflow-hidden bg-white">
              {recent.length === 0 ? (
                <Text className="text-center text-[13px] text-[#6B7280] py-6">
                  No payments yet.
                </Text>
              ) : (
                recent.map((p, i) => (
                  <View
                    key={p.id}
                    className={`px-4 py-3.5 ${i ? "border-t border-[#E5E9F0]" : ""}`}
                  >
                    <Text className="text-[11px] text-[#6B7280]">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </Text>
                    <View className="flex-row items-center justify-between mt-0.5">
                      <Text className="text-[14px] text-[#0F2C4A] flex-1 pr-3">
                        Payment — {p.method.replace("_", " ")} ({p.status})
                      </Text>
                      <Text className="text-[14px] font-semibold text-[#16A34A]">
                        {money(centsToDollars(p.amountMinor))}
                      </Text>
                    </View>
                    <View className="flex-row items-center mt-2">
                      {p.proofUrl ? (
                        <Pressable
                          onPress={() => openProof(p.proofUrl!)}
                          className="flex-row items-center rounded-lg bg-[#EFF6FF] px-2.5 py-1.5"
                        >
                          <Ionicons
                            name="eye-outline"
                            size={14}
                            color="#2563EB"
                          />
                          <Text className="text-[12px] font-medium text-[#2563EB] ml-1">
                            View proof
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => uploadProof(p.id)}
                          disabled={uploadingId === p.id}
                          className="flex-row items-center rounded-lg bg-[#FFF7ED] px-2.5 py-1.5"
                        >
                          <Ionicons
                            name={
                              uploadingId === p.id
                                ? "hourglass-outline"
                                : "cloud-upload-outline"
                            }
                            size={14}
                            color="#C2410C"
                          />
                          <Text className="text-[12px] font-medium text-[#C2410C] ml-1">
                            {uploadingId === p.id
                              ? "Uploading..."
                              : "Upload proof"}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </Screen>
    </View>
  );
}

type PersonalPaymentsViewProps = {
  loading: boolean;
  error: string | null;
  isTenantUser: boolean;
  leases: Lease[];
  units: Unit[];
  rentCharges: RentCharge[];
  payments: Payment[];
  uploadingId: string | null;
  actionError: string | null;
  onUploadProof: (paymentId: string) => void;
  onOpenProof: (url: string) => void;
  onRetry: () => void;
};

// Self-service view for tenants & vendors: their own payments (server already
// scopes the data to the logged-in user) plus a Pay Rent action for tenants.
function PersonalPaymentsView({
  loading,
  error,
  isTenantUser,
  leases,
  units,
  rentCharges,
  payments,
  uploadingId,
  actionError,
  onUploadProof,
  onOpenProof,
  onRetry,
}: PersonalPaymentsViewProps) {
  const unitByLease = useMemo(() => {
    const unitsById = new Map(units.map((u) => [u.id, u]));
    const map = new Map<string, Unit>();
    for (const l of leases) {
      const u = unitsById.get(l.unitId);
      if (u) map.set(l.id, u);
    }
    return map;
  }, [leases, units]);

  const outstandingMinor = useMemo(() => {
    let total = 0;
    for (const c of rentCharges) {
      if (!OUTSTANDING_STATUSES.has(c.status)) continue;
      const owed = Number(c.amountMinor) - Number(c.allocatedMinor);
      if (owed > 0) total += owed;
    }
    return total;
  }, [rentCharges]);

  const myUnit = units[0] ?? null;
  const myLease = leases[0] ?? null;
  const recent = [...payments]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 10);

  return (
    <>
      {loading ? (
        <LoadingView />
      ) : error ? (
        <ErrorView message={error} onRetry={onRetry} />
      ) : (
        <>
          {myUnit ? (
            <Card>
              <Text className="text-[12px] text-[#6B7280] mb-1">My unit</Text>
              <Text className="text-[18px] font-bold text-[#0F2C4A]">
                {myUnit.label}
              </Text>
              <Text className="text-[13px] text-[#6B7280] mt-0.5">
                {myUnit.property?.name ?? "Property"}
              </Text>
              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-[#E5E9F0]">
                <Text className="text-[12px] text-[#6B7280]">
                  Outstanding rent
                </Text>
                <Text
                  className={`text-[16px] font-bold ${
                    outstandingMinor > 0 ? "text-[#DC2626]" : "text-[#16A34A]"
                  }`}
                >
                  {money(centsToDollars(outstandingMinor))}
                </Text>
              </View>
            </Card>
          ) : null}

          {isTenantUser ? (
            <>
              <SectionTitle>Actions</SectionTitle>
              <View className="rounded-2xl border border-[#E5E9F0] overflow-hidden">
                <Row
                  icon="card-outline"
                  iconTint="#F96B1F"
                  title="Pay Rent"
                  sub={
                    myLease
                      ? `Pay for ${myUnit?.label ?? "your unit"}`
                      : "Make a rent payment"
                  }
                  onPress={() => router.push("/(tabs)/payments/pay-rent")}
                />
              </View>
            </>
          ) : null}

          <SectionTitle>My payments</SectionTitle>
          {actionError ? (
            <Text className="text-[13px] text-[#DC2626] mb-2">
              {actionError}
            </Text>
          ) : null}
          <View className="rounded-2xl border border-[#E5E9F0] overflow-hidden bg-white">
            {recent.length === 0 ? (
              <Text className="text-center text-[13px] text-[#6B7280] py-6">
                No payments yet.
              </Text>
            ) : (
              recent.map((p, i) => (
                <View
                  key={p.id}
                  className={`px-4 py-3.5 ${i ? "border-t border-[#E5E9F0]" : ""}`}
                >
                  <Text className="text-[11px] text-[#6B7280]">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </Text>
                  <View className="flex-row items-center justify-between mt-0.5">
                    <Text className="text-[14px] text-[#0F2C4A] flex-1 pr-3">
                      Payment — {p.method.replace("_", " ")} ({p.status})
                    </Text>
                    <Text className="text-[14px] font-semibold text-[#16A34A]">
                      {money(centsToDollars(p.amountMinor))}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-2">
                    {p.proofUrl ? (
                      <Pressable
                        onPress={() => onOpenProof(p.proofUrl!)}
                        className="flex-row items-center rounded-lg bg-[#EFF6FF] px-2.5 py-1.5"
                      >
                        <Ionicons
                          name="eye-outline"
                          size={14}
                          color="#2563EB"
                        />
                        <Text className="text-[12px] font-medium text-[#2563EB] ml-1">
                          View proof
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => onUploadProof(p.id)}
                        disabled={uploadingId === p.id}
                        className="flex-row items-center rounded-lg bg-[#FFF7ED] px-2.5 py-1.5"
                      >
                        <Ionicons
                          name={
                            uploadingId === p.id
                              ? "hourglass-outline"
                              : "cloud-upload-outline"
                          }
                          size={14}
                          color="#C2410C"
                        />
                        <Text className="text-[12px] font-medium text-[#C2410C] ml-1">
                          {uploadingId === p.id
                            ? "Uploading..."
                            : "Upload proof"}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </>
  );
}
