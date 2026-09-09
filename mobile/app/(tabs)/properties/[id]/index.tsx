import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import {
  Bar,
  Btn,
  Card,
  Divider,
  ErrorView,
  Header,
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
import { BASE_URL } from "@/lib/api";

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-[20px] font-bold text-[#0F2C4A]">{n}</Text>
      <Text className="text-[11px] text-[#6B7280] mt-0.5">{label}</Text>
    </View>
  );
}

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
            {p.imageUrls?.[0] ? (
              <Image
                source={`${BASE_URL}${p.imageUrls[0]}`}
                contentFit="cover"
                className="h-40 rounded-2xl mb-4"
              />
            ) : (
              <View className="h-40 rounded-2xl bg-[#CBD5E1] items-center justify-center mb-4">
                <Ionicons name="image-outline" size={40} color="#64748B" />
              </View>
            )}

            <Text className="text-[16px] font-semibold text-[#0F2C4A]">
              {p.address},
            </Text>
            <Text className="text-[13px] text-[#6B7280] mb-4">{p.city}</Text>

            <Card className="flex-row py-4">
              <Stat n={unitList.length} label="Total Units" />
              <Stat n={occupied} label="Occupied" />
              <Stat n={vacant} label="Vacant" />
            </Card>

            <Card className="mt-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[13px] text-[#6B7280]">
                  Occupancy Rate
                </Text>
                <Text className="text-[15px] font-bold text-[#0F2C4A]">
                  {occupancy}%
                </Text>
              </View>
              <Bar pct={occupancy} />
            </Card>

            <Card className="mt-3">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                  Financial Summary
                </Text>
                <Text className="text-[12px] text-[#6B7280]">All Time</Text>
              </View>
              <View className="flex-row">
                <View className="flex-1">
                  <Text className="text-[12px] text-[#6B7280] mb-1">
                    Collected
                  </Text>
                  <Text className="text-[20px] font-bold text-[#16A34A]">
                    {money(collected)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-[#6B7280] mb-1">
                    Outstanding
                  </Text>
                  <Text className="text-[20px] font-bold text-[#DC2626]">
                    {money(outstanding)}
                  </Text>
                </View>
              </View>
            </Card>

            <View className="mt-3 rounded-2xl border border-[#E5E9F0] overflow-hidden">
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
            </View>

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
