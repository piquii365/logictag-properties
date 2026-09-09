import { useMemo } from "react";
import { Text, View } from "react-native";
import {
  Divider,
  ErrorView,
  Group,
  Header,
  LoadingView,
  Screen,
  SectionTitle,
} from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import { getMaintenanceRequests, getMyUnits, getProperties, getRentCharges, getVendors } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { MaintenanceStatus } from "@/lib/types";

const OUTSTANDING_STATUSES = new Set(["outstanding", "part_paid"]);

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  quoted: "Quoted",
  approved: "Approved",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  cancelled: "Cancelled",
};

export default function Reports() {
  const properties = useFetch(getProperties);
  const units = useFetch(getMyUnits);
  const rentCharges = useFetch(getRentCharges);
  const requests = useFetch(getMaintenanceRequests);
  const vendors = useFetch(getVendors);

  const loading =
    properties.loading || units.loading || rentCharges.loading || requests.loading || vendors.loading;
  const error = properties.error ?? units.error ?? rentCharges.error ?? requests.error ?? vendors.error;

  const { collected, outstanding } = useMemo(() => {
    const charges = rentCharges.data ?? [];
    const collectedMinor = charges.reduce((s, c) => s + Number(c.allocatedMinor), 0);
    const outstandingMinor = charges
      .filter((c) => OUTSTANDING_STATUSES.has(c.status))
      .reduce((s, c) => s + (Number(c.amountMinor) - Number(c.allocatedMinor)), 0);
    return { collected: centsToDollars(collectedMinor), outstanding: centsToDollars(outstandingMinor) };
  }, [rentCharges.data]);

  const requestsByStatus = useMemo(() => {
    const counts = new Map<MaintenanceStatus, number>();
    for (const r of requests.data ?? []) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    return counts;
  }, [requests.data]);

  const occupied = (units.data ?? []).filter((u) => u.status === "occupied").length;
  const vacant = (units.data ?? []).filter((u) => u.status === "vacant").length;
  const approvedVendors = (vendors.data ?? []).filter((v) => v.status === "approved").length;

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Reports" />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              properties.refetch();
              units.refetch();
              rentCharges.refetch();
              requests.refetch();
              vendors.refetch();
            }}
          />
        ) : (
          <>
            <SectionTitle>Portfolio</SectionTitle>
            <View className="border border-[#E5E9F0] rounded-lg bg-white">
              <View className="flex-row">
                <View className="flex-1 px-4 py-4">
                  <Text className="text-[22px] font-bold text-[#0F2C4A]">
                    {(properties.data ?? []).length}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    Properties
                  </Text>
                </View>
                <View className="w-px bg-[#E5E9F0]" />
                <View className="flex-1 px-4 py-4">
                  <Text className="text-[22px] font-bold text-[#0F2C4A]">
                    {(units.data ?? []).length}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    Units
                  </Text>
                </View>
              </View>
              <View className="h-px bg-[#E5E9F0]" />
              <View className="flex-row">
                <View className="flex-1 px-4 py-4">
                  <Text className="text-[22px] font-bold text-[#16A34A]">
                    {occupied}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    Occupied
                  </Text>
                </View>
                <View className="w-px bg-[#E5E9F0]" />
                <View className="flex-1 px-4 py-4">
                  <Text className="text-[22px] font-bold text-[#6B7280]">
                    {vacant}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    Vacant
                  </Text>
                </View>
              </View>
            </View>

            <SectionTitle>Rent Collection</SectionTitle>
            <View className="border border-[#E5E9F0] rounded-lg bg-white">
              <View className="flex-row">
                <View className="flex-1 px-4 py-4">
                  <Text className="text-[12px] text-[#6B7280] mb-1">
                    Collected
                  </Text>
                  <Text className="text-[20px] font-bold text-[#16A34A]">
                    {money(collected)}
                  </Text>
                </View>
                <View className="w-px bg-[#E5E9F0]" />
                <View className="flex-1 px-4 py-4">
                  <Text className="text-[12px] text-[#6B7280] mb-1">
                    Outstanding
                  </Text>
                  <Text className="text-[20px] font-bold text-[#DC2626]">
                    {money(outstanding)}
                  </Text>
                </View>
              </View>
            </View>

            <SectionTitle>Maintenance by Status</SectionTitle>
            {requestsByStatus.size === 0 ? (
              <Text className="text-[13px] text-[#6B7280]">
                No maintenance requests yet.
              </Text>
            ) : (
              <Group>
                {[...requestsByStatus.entries()].map(([status, count], i) => (
                  <View key={status}>
                    {i > 0 ? <Divider /> : null}
                    <View className="flex-row items-center justify-between px-4 py-2.5">
                      <Text className="text-[13px] text-[#6B7280]">
                        {STATUS_LABEL[status]}
                      </Text>
                      <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                        {count}
                      </Text>
                    </View>
                  </View>
                ))}
              </Group>
            )}

            <SectionTitle>Vendors</SectionTitle>
            <Group>
              <View className="flex-row items-center justify-between px-4 py-3">
                <Text className="text-[13px] text-[#6B7280]">
                  Approved vendors
                </Text>
                <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                  {approvedVendors}
                </Text>
              </View>
            </Group>
          </>
        )}
      </Screen>
    </View>
  );
}
