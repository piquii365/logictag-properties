import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import {
  Avatar,
  Badge,
  Card,
  Divider,
  ErrorView,
  Header,
  LoadingView,
  Row,
  Screen,
} from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import { getLeases, getPayments, getRentCharges, getUnit } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

const OUTSTANDING_STATUSES = new Set(["outstanding", "part_paid"]);

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
