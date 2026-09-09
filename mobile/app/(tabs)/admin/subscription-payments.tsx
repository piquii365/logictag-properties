import { Text, View } from "react-native";
import {
  Card,
  ErrorView,
  Header,
  LoadingView,
  Screen,
  StatusText,
} from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import { getAllSubscriptionPayments } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

function statusTone(status: string): "green" | "red" | "amber" | "muted" {
  if (status === "succeeded") return "green";
  if (status === "failed") return "red";
  return "amber";
}

export default function AdminSubscriptionPayments() {
  const payments = useFetch(getAllSubscriptionPayments);
  const list = payments.data ?? [];

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Subscription payments" />
      <Screen>
        {payments.loading ? (
          <LoadingView />
        ) : payments.error ? (
          <ErrorView message={payments.error} onRetry={payments.refetch} />
        ) : list.length === 0 ? (
          <Card>
            <Text className="text-[13px] text-[#6B7280]">
              No subscription payments recorded yet.
            </Text>
          </Card>
        ) : (
          list.map((payment) => (
            <Card key={payment.id} className="mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                    {payment.subscription?.user?.name ?? "Unknown user"}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    {payment.subscription?.plan?.name ?? "Plan"} ·{" "}
                    {payment.subscription?.user?.email ?? ""}
                  </Text>
                </View>
                <StatusText
                  text={payment.status}
                  tone={statusTone(payment.status)}
                />
              </View>
              <View className="flex-row items-end justify-between mt-4">
                <View>
                  <Text className="text-[11px] text-[#6B7280]">Amount</Text>
                  <Text className="text-[18px] font-bold text-[#0F2C4A] mt-1">
                    {money(centsToDollars(payment.amountMinor))}
                  </Text>
                </View>
                <Text className="text-[12px] text-[#6B7280]">
                  {payment.createdAt
                    ? new Date(payment.createdAt).toLocaleDateString()
                    : ""}
                </Text>
              </View>
            </Card>
          ))
        )}
      </Screen>
    </View>
  );
}
