import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Header } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { allocatePaymentToLease, updatePaymentStatus } from "@/lib/queries";

export default function Processing() {
  const { paymentId, amount = "0.00", leaseId } = useLocalSearchParams<{
    paymentId?: string;
    amount?: string;
    leaseId?: string;
  }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) {
      setError("Missing payment reference.");
      return;
    }
    // ponytail: fixed delay stands in for polling a real gateway (none is
    // wired up server-side yet) — the Payment row itself is real.
    const t = setTimeout(async () => {
      try {
        const confirmed = await updatePaymentStatus(paymentId, "succeeded");
        if (leaseId) {
          const amountMinor = String(Math.round(Number(amount) * 100));
          await allocatePaymentToLease(paymentId, leaseId, amountMinor);
        }
        router.replace({
          pathname: "/(tabs)/payments/receipt",
          params: {
            amount,
            reference: confirmed.merchantReference,
            date: new Date(confirmed.paidAt ?? confirmed.createdAt).toLocaleString(),
          },
        });
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [paymentId, amount, leaseId]);

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Processing Payment" back={false} />
      <View className="flex-1 items-center justify-center px-10">
        {error ? (
          <Text className="text-[14px] text-[#DC2626] text-center leading-6">{error}</Text>
        ) : (
          <>
            <ActivityIndicator size="large" color="#0F2C4A" />
            <Text className="text-[15px] text-[#0F2C4A] text-center mt-8 leading-6">
              We&apos;re confirming your payment.{"\n"}This usually takes a few seconds.
            </Text>

            <View className="w-full mt-10 pt-6 border-t border-[#E5E9F0]">
              <View className="flex-row items-center justify-between py-1.5">
                <Text className="text-[13px] text-[#6B7280]">Amount</Text>
                <Text className="text-[14px] font-semibold text-[#0F2C4A]">${amount} USD</Text>
              </View>
            </View>

            <Text className="text-[13px] text-[#6B7280] text-center mt-10 leading-5">
              Please do not close this screen{"\n"}or go back.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
