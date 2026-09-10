import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Avatar,
  Badge,
  Btn,
  Card,
  Divider,
  ErrorView,
  Field,
  Header,
  LoadingView,
  Row,
  Screen,
  Select,
} from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import { apiErrorMessage } from "@/lib/api";
import {
  getLeases,
  getPayments,
  getRentCharges,
  getTenantIdentification,
  getUnit,
  saveTenantIdentification,
  verifyTenantIdentification,
} from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

const OUTSTANDING_STATUSES = new Set(["outstanding", "part_paid"]);

const ID_TYPES = [
  { label: "National ID", value: "national_id" },
  { label: "Passport", value: "passport" },
  { label: "Driver's licence", value: "drivers_licence" },
  { label: "Company registration", value: "company_registration" },
] as const;

// This route's dynamic segment is a unit id: a unit's current occupant *is*
// "the tenant" here, which sidesteps needing a separate Tenant CRM record
// linked up before this screen has anything real to show.
export default function TenantDetail() {
  const { id: unitId } = useLocalSearchParams<{ id: string }>();

  // unitId can be momentarily undefined on the very first render (expo-router
  // resolves route params a tick after mount) — never template that into a
  // URL, or the server's ParseUUIDPipe rejects the literal string "undefined".
  const unit = useFetch(
    () => (unitId ? getUnit(unitId) : Promise.resolve(null)),
    [unitId],
  );
  const leases = useFetch(getLeases);
  const rentCharges = useFetch(getRentCharges);
  const payments = useFetch(getPayments);

  const currentLease = useMemo(
    () =>
      (leases.data ?? [])
        .filter((l) => l.unitId === unitId)
        .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0] ?? null,
    [leases.data, unitId],
  );

  const balance = useMemo(() => {
    if (!currentLease) return 0;
    const minor = (rentCharges.data ?? [])
      .filter(
        (c) =>
          c.leaseId === currentLease.id && OUTSTANDING_STATUSES.has(c.status),
      )
      .reduce(
        (s, c) => s + (Number(c.amountMinor) - Number(c.allocatedMinor)),
        0,
      );
    return centsToDollars(minor);
  }, [rentCharges.data, currentLease]);

  const lastPayment = useMemo(() => {
    if (!currentLease) return null;
    return (
      (payments.data ?? [])
        .filter(
          (p) => p.leaseId === currentLease.id && p.status === "succeeded",
        )
        .sort((a, b) => (a.paidAt ?? "").localeCompare(b.paidAt ?? ""))
        .at(-1) ?? null
    );
  }, [payments.data, currentLease]);

  const u = unit.data;
  const loading = unit.loading;

  const tenantId = u?.tenant?.id;
  const identification = useFetch(
    () =>
      tenantId ? getTenantIdentification(tenantId) : Promise.resolve(null),
    [tenantId],
  );

  const [idType, setIdType] = useState("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [idExpiry, setIdExpiry] = useState("");
  const [savingId, setSavingId] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);

  async function saveIdentification() {
    if (!tenantId) return;
    const clean = idNumber.trim();
    if (!clean) {
      setIdError("ID number is required.");
      return;
    }
    setSavingId(true);
    setIdError(null);
    try {
      await saveTenantIdentification(tenantId, {
        idType,
        idNumber: clean,
        idExpiryDate: idExpiry.trim() || undefined,
      });
      await identification.refetch();
      setIdNumber("");
      setIdExpiry("");
    } catch (err) {
      setIdError(apiErrorMessage(err));
    } finally {
      setSavingId(false);
    }
  }

  async function verifyIdentification() {
    if (!tenantId) return;
    setIdError(null);
    try {
      await verifyTenantIdentification(tenantId);
      await identification.refetch();
    } catch (err) {
      setIdError(apiErrorMessage(err));
    }
  }

  const ident = identification.data;

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title={u?.tenant?.name ?? "Tenant"} right="ellipsis-horizontal" />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : unit.error || !u?.tenant ? (
          <ErrorView
            message={unit.error ?? "No tenant assigned to this unit."}
            onRetry={unit.refetch}
          />
        ) : (
          <>
            <Card className="flex-row items-center">
              <Avatar
                initials={u.tenant.name
                  .split(" ")
                  .map((s) => s[0])
                  .join("")}
                size={52}
              />
              <View className="ml-3 flex-1">
                <Text className="text-[12px] text-[#6B7280] mb-1">
                  Contact Information
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="call-outline" size={13} color="#6B7280" />
                  <Text className="text-[13px] text-[#0F2C4A] ml-1.5">
                    {u.tenant.phone ?? "—"}
                  </Text>
                </View>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="mail-outline" size={13} color="#6B7280" />
                  <Text className="text-[13px] text-[#0F2C4A] ml-1.5">
                    {u.tenant.email}
                  </Text>
                </View>
              </View>
            </Card>

            <Card className="mt-3">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                  Current Lease
                </Text>
                {currentLease ? (
                  <Badge
                    text={currentLease.status}
                    tone={currentLease.status === "active" ? "green" : "muted"}
                  />
                ) : null}
              </View>
              {currentLease ? (
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={15} color="#6B7280" />
                  <Text className="text-[13px] text-[#0F2C4A] ml-2">
                    {currentLease.startDate} -{" "}
                    {currentLease.endDate ?? "ongoing"}
                  </Text>
                </View>
              ) : (
                <Text className="text-[13px] text-[#6B7280]">
                  No lease has been set up for this unit yet.
                </Text>
              )}
              <Text className="text-[13px] text-[#6B7280] mt-2">
                {u.label} · {u.property?.name ?? "—"}
              </Text>
            </Card>

            <Card className="mt-3">
              <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-4">
                Financial Summary
              </Text>
              <View className="flex-row">
                <View className="flex-1">
                  <Text className="text-[12px] text-[#6B7280] mb-1">
                    Current Balance
                  </Text>
                  <Text
                    className="text-[20px] font-bold"
                    style={{ color: balance ? "#DC2626" : "#16A34A" }}
                  >
                    {money(balance)}
                  </Text>
                  {balance ? (
                    <Text className="text-[11px] text-[#DC2626] mt-0.5">
                      Overdue
                    </Text>
                  ) : null}
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-[#6B7280] mb-1">
                    Last Payment
                  </Text>
                  {lastPayment ? (
                    <>
                      <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                        {new Date(
                          lastPayment.paidAt ?? lastPayment.createdAt,
                        ).toLocaleDateString()}
                      </Text>
                      <Text className="text-[14px] font-semibold text-[#16A34A] mt-0.5">
                        {money(centsToDollars(lastPayment.amountMinor))}
                      </Text>
                    </>
                  ) : (
                    <Text className="text-[14px] text-[#6B7280]">None yet</Text>
                  )}
                </View>
              </View>
            </Card>

            <Card className="mt-3">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                  Identification
                </Text>
                {ident ? (
                  <Badge
                    text={ident.verified ? "Verified" : "Unverified"}
                    tone={ident.verified ? "green" : "amber"}
                  />
                ) : null}
              </View>

              {ident ? (
                <>
                  <View className="flex-row justify-between py-1">
                    <Text className="text-[13px] text-[#6B7280]">Type</Text>
                    <Text className="text-[13px] font-semibold text-[#0F2C4A] capitalize">
                      {ident.idType.replaceAll("_", " ")}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-1">
                    <Text className="text-[13px] text-[#6B7280]">Number</Text>
                    <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                      {ident.idNumber}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-1">
                    <Text className="text-[13px] text-[#6B7280]">
                      Issuing country
                    </Text>
                    <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                      {ident.issuingCountry}
                    </Text>
                  </View>
                  {ident.idExpiryDate ? (
                    <View className="flex-row justify-between py-1">
                      <Text className="text-[13px] text-[#6B7280]">
                        Expires
                      </Text>
                      <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                        {ident.idExpiryDate}
                      </Text>
                    </View>
                  ) : null}
                  {!ident.verified ? (
                    <View className="mt-3">
                      <Btn
                        label="Mark as verified"
                        variant="outline"
                        onPress={verifyIdentification}
                      />
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <Text className="text-[12px] text-[#6B7280] mb-3 leading-5">
                    Capture the tenant's identity document for ZIMRA and FIA
                    record-keeping.
                  </Text>
                  <Select
                    label="Document type"
                    options={ID_TYPES}
                    value={idType}
                    onChange={setIdType}
                  />
                  <Field
                    label="ID number"
                    value={idNumber}
                    onChangeText={setIdNumber}
                    autoCapitalize="characters"
                  />
                  <Field
                    label="Expiry date (optional)"
                    value={idExpiry}
                    onChangeText={setIdExpiry}
                    placeholder="YYYY-MM-DD"
                    autoCapitalize="none"
                  />
                  {idError ? (
                    <Text className="text-[13px] text-[#DC2626] mb-3">
                      {idError}
                    </Text>
                  ) : null}
                  <Btn
                    label={savingId ? "Saving..." : "Save identification"}
                    onPress={saveIdentification}
                    disabled={savingId}
                  />
                </>
              )}
            </Card>

            <View className="mt-3 rounded-2xl border border-[#E5E9F0] overflow-hidden">
              <Row
                icon="cash-outline"
                title="Payment History"
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/tenants/statement",
                    params: { unitId },
                  })
                }
              />
              <Divider />
              <Row
                icon="home-outline"
                title="Rent Charges"
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/charges/rent",
                    params: { unitId },
                  })
                }
              />
              <Divider />
              <Row
                icon="flash-outline"
                title="Utility Charges"
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/charges/utilities",
                    params: { unitId },
                  })
                }
              />
              <Divider />
              <Row
                icon="construct-outline"
                title="Maintenance Requests"
                onPress={() => router.push("/(tabs)/maintenance")}
              />
            </View>
          </>
        )}
      </Screen>
    </View>
  );
}
