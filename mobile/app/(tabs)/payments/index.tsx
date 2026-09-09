import { router } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { Card, Divider, ErrorView, Header, LoadingView, Row, Screen, SectionTitle, StatusText } from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import { getLeases, getMyUnits, getPayments, getRentCharges } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { Unit } from "@/lib/types";

const OUTSTANDING_STATUSES = new Set(["outstanding", "part_paid"]);

export default function Payments() {
  const units = useFetch(getMyUnits);
  const leases = useFetch(getLeases);
  const rentCharges = useFetch(getRentCharges);
  const payments = useFetch(getPayments);

  const loading = units.loading || leases.loading || rentCharges.loading || payments.loading;
  const error = units.error ?? leases.error ?? rentCharges.error ?? payments.error;

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
  const outstanding = centsToDollars([...outstandingByLease.values()].reduce((s, v) => s + v, 0));

  const recent = [...(payments.data ?? [])]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 10);

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Payments" back={false} right="notifications-outline" badge />
      <Screen>
        {loading ? (
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
                  <Text className="text-[12px] text-[#6B7280] mb-1">Collected</Text>
                  <Text className="text-[22px] font-bold text-[#16A34A]">{money(collected)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-[#6B7280] mb-1">Outstanding</Text>
                  <Text className="text-[22px] font-bold text-[#DC2626]">{money(outstanding)}</Text>
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
                [...outstandingByLease.entries()].map(([leaseId, owedMinor], i) => {
                  const unit = unitByLease.get(leaseId);
                  return (
                    <View key={leaseId}>
                      {i ? <Divider /> : null}
                      <Row
                        title={`${unit?.tenant?.name ?? "Tenant"} - ${unit?.label ?? ""}`}
                        sub={unit?.property?.name ?? ""}
                        right={<StatusText text={`${money(centsToDollars(owedMinor))} due`} tone="red" />}
                        chevron={false}
                        onPress={() => router.push({ pathname: "/(tabs)/payments/record", params: { leaseId } })}
                      />
                    </View>
                  );
                })
              )}
            </View>

            <SectionTitle>Recent transactions</SectionTitle>
            <View className="rounded-2xl border border-[#E5E9F0] overflow-hidden bg-white">
              {recent.length === 0 ? (
                <Text className="text-center text-[13px] text-[#6B7280] py-6">No payments yet.</Text>
              ) : (
                recent.map((p, i) => (
                  <View key={p.id} className={`px-4 py-3.5 ${i ? "border-t border-[#E5E9F0]" : ""}`}>
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
