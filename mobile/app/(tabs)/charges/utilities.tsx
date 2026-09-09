import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Card, ErrorView, Header, LoadingView, Screen } from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import { getUtilityCharges } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

export default function UtilityCharges() {
  const { unitId } = useLocalSearchParams<{ unitId?: string }>();
  const charges = useFetch(getUtilityCharges);
  const list = (charges.data ?? []).filter(
    (charge) => !unitId || charge.unitId === unitId,
  );
  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Utility Charges" />
      <Screen>
        {charges.loading ? (
          <LoadingView />
        ) : charges.error ? (
          <ErrorView message={charges.error} onRetry={charges.refetch} />
        ) : list.length === 0 ? (
          <Text className="text-center text-[13px] text-[#6B7280] mt-10">
            No utility charges found.
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
