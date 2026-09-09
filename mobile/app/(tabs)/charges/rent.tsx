import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Card, ErrorView, Header, LoadingView, Screen } from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import { getLeases, getRentCharges } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

export default function RentCharges() {
  const { unitId } = useLocalSearchParams<{ unitId?: string }>();
  const leases = useFetch(getLeases);
  const charges = useFetch(getRentCharges);
  const leaseIds = new Set(
    (leases.data ?? [])
      .filter((lease) => !unitId || lease.unitId === unitId)
      .map((lease) => lease.id),
  );
  const list = (charges.data ?? []).filter((charge) =>
    leaseIds.has(charge.leaseId),
  );
  const error = leases.error ?? charges.error;
  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Rent Charges" />
      <Screen>
        {leases.loading || charges.loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              leases.refetch();
              charges.refetch();
            }}
          />
        ) : list.length === 0 ? (
          <Text className="text-center text-[13px] text-[#6B7280] mt-10">
            No rent charges found.
          </Text>
        ) : (
          list.map((charge) => (
            <Card key={charge.id} className="mb-3">
              <View className="flex-row justify-between">
                <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                  {charge.periodStart} to {charge.periodEnd}
                </Text>
                <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                  {money(centsToDollars(Number(charge.amountMinor)))}
                </Text>
              </View>
              <Text className="text-[12px] text-[#6B7280] mt-1">
                Due {charge.dueDate} · {charge.status}
              </Text>
            </Card>
          ))
        )}
      </Screen>
    </View>
  );
}
