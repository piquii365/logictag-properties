import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import {
  Bar,
  Btn,
  Divider,
  ErrorView,
  Group,
  Header,
  Hero,
  LoadingView,
  Row,
  Screen,
} from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import {
  getLeases,
  getMaintenanceRequests,
  getProperty,
  getPropertyUnits,
  getRentCharges,
} from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

const OPEN_STATUSES = new Set([
  "open",
  "assigned",
  "quoted",
  "approved",
  "in_progress",
]);
const OUTSTANDING_STATUSES = new Set(["outstanding", "part_paid"]);

export default function PropertyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  // id can be momentarily undefined on the very first render — never
  // template that into a URL as the literal string "undefined".
  const property = useFetch(
    () => (id ? getProperty(id) : Promise.resolve(null)),
    [id],
  );
  const units = useFetch(
    () => (id ? getPropertyUnits(id) : Promise.resolve([])),
    [id],
  );
  const leases = useFetch(getLeases);
  const rentCharges = useFetch(getRentCharges);
  const requests = useFetch(getMaintenanceRequests);

  const loading = property.loading || units.loading;
  const error = property.error ?? units.error;

  const unitIds = useMemo(
    () => new Set((units.data ?? []).map((u) => u.id)),
    [units.data],
  );

  const { collected, outstanding } = useMemo(() => {
    const leaseIds = new Set(
      (leases.data ?? []).filter((l) => unitIds.has(l.unitId)).map((l) => l.id),
    );
    const charges = (rentCharges.data ?? []).filter((c) =>
      leaseIds.has(c.leaseId),
    );
    const collectedMinor = charges.reduce(
      (s, c) => s + Number(c.allocatedMinor),
      0,
    );
    const outstandingMinor = charges
      .filter((c) => OUTSTANDING_STATUSES.has(c.status))
      .reduce(
        (s, c) => s + (Number(c.amountMinor) - Number(c.allocatedMinor)),
        0,
      );
    return {
      collected: centsToDollars(collectedMinor),
      outstanding: centsToDollars(outstandingMinor),
    };
  }, [leases.data, rentCharges.data, unitIds]);

  const openRequests = useMemo(
    () =>
      (requests.data ?? []).filter(
        (r) => unitIds.has(r.unitId) && OPEN_STATUSES.has(r.status),
      ).length,
    [requests.data, unitIds],
  );

  const p = property.data;
  const unitList = units.data ?? [];
  const occupied = unitList.filter((u) => u.status === "occupied").length;
  const vacant = unitList.filter((u) => u.status === "vacant").length;
  const occupancy = unitList.length
    ? Math.round((occupied / unitList.length) * 100)
    : 0;

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header
        title={p?.name ?? ""}
        right="create-outline"
        onRight={() =>
          p &&
          router.push({
            pathname: "/(tabs)/properties/[id]/edit",
            params: { id: p.id },
          })
        }
      />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : error || !p ? (
          <ErrorView
            message={error ?? "Property not found."}
            onRetry={property.refetch}
          />
        ) : (
          <>
            <Hero source={p.imageUrls?.[0]} />

            <Text className="text-[16px] font-semibold text-[#0F2C4A] mt-4">
              {p.address}
            </Text>
            <Text className="text-[13px] text-[#6B7280]">{p.city}</Text>

            {/* Unit occupancy, flat with dividers — no boxes. */}
            <View className="flex-row mt-5 border-t border-b border-[#E5E9F0] py-4">
              <View className="flex-1">
                <Text className="text-[20px] font-bold text-[#0F2C4A]">
                  {unitList.length}
                </Text>
                <Text className="text-[12px] text-[#6B7280] mt-0.5">
                  Total units
                </Text>
              </View>
              <View className="w-px bg-[#E5E9F0]" />
              <View className="flex-1 px-4">
                <Text className="text-[20px] font-bold text-[#0F2C4A]">
                  {occupied}
                </Text>
                <Text className="text-[12px] text-[#6B7280] mt-0.5">
                  Occupied
                </Text>
              </View>
              <View className="w-px bg-[#E5E9F0]" />
              <View className="flex-1 pl-4">
                <Text className="text-[20px] font-bold text-[#0F2C4A]">
                  {vacant}
                </Text>
                <Text className="text-[12px] text-[#6B7280] mt-0.5">
                  Vacant
                </Text>
              </View>
            </View>

            <View className="mt-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] text-[#6B7280]">
                  Occupancy rate
                </Text>
                <Text className="text-[15px] font-bold text-[#0F2C4A]">
                  {occupancy}%
                </Text>
              </View>
              <Bar pct={occupancy} />
            </View>

            <View className="mt-6">
              <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-3">
                Financial summary
              </Text>
              <View className="flex-row border-t border-b border-[#E5E9F0] py-4">
                <View className="flex-1">
                  <Text className="text-[12px] text-[#6B7280] mb-1">
                    Collected
                  </Text>
                  <Text className="text-[20px] font-bold text-[#16A34A]">
                    {money(collected)}
                  </Text>
                </View>
                <View className="w-px bg-[#E5E9F0]" />
                <View className="flex-1 pl-4">
                  <Text className="text-[12px] text-[#6B7280] mb-1">
                    Outstanding
                  </Text>
                  <Text className="text-[20px] font-bold text-[#DC2626]">
                    {money(outstanding)}
                  </Text>
                </View>
              </View>
            </View>

            <Group className="mt-5">
              <Row
                icon="grid-outline"
                title="Units"
                sub="View all units in this property"
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/properties/[id]/units",
                    params: { id: p.id },
                  })
                }
              />
              <Divider />
              <Row
                icon="construct-outline"
                title="Maintenance"
                sub={`${openRequests} Open request${openRequests === 1 ? "" : "s"}`}
                onPress={() => router.push("/(tabs)/maintenance")}
              />
              <Divider />
              <Row
                icon="flash-outline"
                title="Utilities"
                sub="Current billing period"
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/utilities",
                    params: { propertyId: p.id },
                  })
                }
              />
            </Group>

            <Btn
              label="Add Unit"
              className="mt-4"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/properties/[id]/add-unit",
                  params: { id: p.id },
                })
              }
            />
          </>
        )}
      </Screen>
    </View>
  );
}
