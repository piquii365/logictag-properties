import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import {
  Avatar,
  Badge,
  Btn,
  Card,
  Divider,
  ErrorView,
  Header,
  KV,
  LoadingView,
  Row,
  Screen,
} from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import { getLeases, getRentCharges, getUnit } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

const STATUS_LABEL = {
  occupied: "Occupied",
  vacant: "Vacant",
  maintenance: "Maintenance",
} as const;
const OUTSTANDING_STATUSES = new Set(["outstanding", "part_paid"]);

export default function UnitDetail() {
  const { unitId } = useLocalSearchParams<{ unitId: string }>();

  // unitId can be momentarily undefined on the very first render — never
  // template that into a URL as the literal string "undefined".
  const unit = useFetch(
    () => (unitId ? getUnit(unitId) : Promise.resolve(null)),
    [unitId],
  );
  const leases = useFetch(getLeases);
  const rentCharges = useFetch(getRentCharges);

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

  const u = unit.data;
  const loading = unit.loading;
  const error = unit.error;

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header
        title={u?.label ?? ""}
        right="create-outline"
        onRight={() =>
          u &&
          router.push({
            pathname: "/(tabs)/properties/units/edit",
            params: { unitId: u.id },
          })
        }
      />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : error || !u ? (
          <ErrorView
            message={error ?? "Unit not found."}
            onRetry={unit.refetch}
          />
        ) : (
          <>
            <View className="flex-row justify-end mb-3">
              <Badge
                text={STATUS_LABEL[u.status]}
                tone={
                  u.status === "occupied"
                    ? "green"
                    : u.status === "vacant"
                      ? "muted"
                      : "amber"
                }
              />
            </View>

            <Card>
              <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-1">
                Unit Information
              </Text>
              <KV k="Property" v={u.property?.name ?? "—"} />
              <KV k="Floor" v={u.floor ?? "—"} />
              <KV k="Bedrooms" v={String(u.bedrooms)} />
              <KV k="Monthly Rent" v={`$${u.rent}`} />
            </Card>

            {u.tenant ? (
              <>
                <Card className="mt-3">
                  <View className="flex-row items-center">
                    <Avatar
                      initials={u.tenant.name
                        .split(" ")
                        .map((s) => s[0])
                        .join("")}
                      tint="#F96B1F"
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-[12px] text-[#6B7280]">
                        Current Tenant
                      </Text>
                      <Text className="text-[15px] font-semibold text-[#F96B1F]">
                        {u.tenant.name}
                      </Text>
                      {currentLease?.endDate ? (
                        <Text className="text-[12px] text-[#6B7280] mt-0.5">
                          Lease active until {currentLease.endDate}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Divider />
                  <KV
                    k="Balance"
                    v={balance ? money(balance) : "$0.00"}
                    tone={balance ? "#DC2626" : "#16A34A"}
                  />
                </Card>

                <View className="mt-3 rounded-2xl border border-[#E5E9F0] overflow-hidden">
                  <Row
                    icon="document-text-outline"
                    title="Lease Details"
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/tenants/[id]",
                        params: { id: unitId },
                      })
                    }
                  />
                  <Divider />
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
                    icon="construct-outline"
                    title="Maintenance History"
                    onPress={() => router.push("/(tabs)/maintenance")}
                  />
                  <Divider />
                  <Row
                    icon="flash-outline"
                    title="Utility Information"
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/utilities",
                        params: { propertyId: u.propertyId },
                      })
                    }
                  />
                </View>
              </>
            ) : (
              <Card className="mt-3">
                <Text className="text-[14px] text-[#6B7280]">
                  This unit is vacant. Assign a tenant to start a lease.
                </Text>
                <Btn
                  label="Assign Tenant"
                  className="mt-4"
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/tenants/new",
                      params: { unitId },
                    })
                  }
                />
              </Card>
            )}

            <View className="flex-row gap-3 mt-5">
              <Btn
                label="Edit Unit"
                variant="outline"
                className="flex-1"
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/properties/units/edit",
                    params: { unitId: u.id },
                  })
                }
              />
              {u.tenant ? (
                <Btn
                  label="View Statement"
                  className="flex-1"
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/tenants/statement",
                      params: { unitId },
                    })
                  }
                />
              ) : null}
            </View>
          </>
        )}
      </Screen>
    </View>
  );
}
