import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Btn, Header } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import {
  allocatePaymentToLease,
  checkPesepayStatus,
  initiatePesepay,
} from "@/lib/queries";
import type { Payment } from "@/lib/types";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // ~2 minutes before we give up and let the user retry.

export default function Processing() {
  const {
    paymentId,
    amount = "0.00",
    leaseId,
    phoneNumber,
    paymentMethodCode,
  } = useLocalSearchParams<{
    paymentId?: string;
    amount?: string;
    leaseId?: string;
    phoneNumber?: string;
    paymentMethodCode?: string;
  }>();
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!paymentId) {
      setError("Missing payment reference.");
      return;
    }
    if (!phoneNumber || !paymentMethodCode) {
      setError(
        "Missing payment details — go back and start the payment again.",
      );
      return;
    }

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    async function finish(payment: Payment) {
      if (leaseId) {
        const amountMinor = String(Math.round(Number(amount) * 100));
        await allocatePaymentToLease(paymentId!, leaseId, amountMinor);
      }
      router.replace({
        pathname: "/(tabs)/payments/receipt",
        params: {
          paymentId: payment.id,
          amount,
          reference: payment.merchantReference,
          date: new Date(payment.paidAt ?? payment.createdAt).toLocaleString(),
        },
      });
    }

    async function run() {
      try {
        // 1. Ask the gateway to start the transaction. The customer approves
        //    it on their phone (mobile money) or via the redirect (card).
        let payment = await initiatePesepay(paymentId!, {
          phoneNumber: phoneNumber!,
          paymentMethodCode: paymentMethodCode!,
        });

        // 2. Poll until the gateway reports a terminal status.
        for (let i = 0; i < MAX_POLLS; i++) {
          if (cancelled.current) return;
          if (payment.status === "succeeded") {
            await finish(payment);
            return;
          }
          if (
            payment.status === "failed" ||
            payment.status === "reversed" ||
            payment.status === "expired"
          ) {
            setError(
              "The payment was not completed. You can try again or use a different method.",
            );
            return;
          }
          await sleep(POLL_INTERVAL_MS);
          if (cancelled.current) return;
          payment = await checkPesepayStatus(paymentId!);
        }

        setError(
          "We're still waiting for confirmation from the payment provider. Check your payments list in a moment.",
        );
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    }

    void run();
    return () => {
      cancelled.current = true;
    };
  }, [paymentId, amount, leaseId, phoneNumber, paymentMethodCode, retryKey]);

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Processing Payment" back={false} />
      <View className="flex-1 items-center justify-center px-10">
        {error ? (
          <>
            <Text className="text-[14px] text-[#DC2626] text-center leading-6">
              {error}
            </Text>
            <Btn
              label="Try again"
              className="mt-6 w-full"
              onPress={() => {
                setError(null);
                setRetryKey((k) => k + 1);
              }}
            />
            <Btn
              label="Back to payments"
              variant="outline"
              className="mt-3 w-full"
              onPress={() => router.replace("/(tabs)/payments")}
            />
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#0F2C4A" />
            <Text className="text-[15px] text-[#0F2C4A] text-center mt-8 leading-6">
              We&apos;re confirming your payment.{"\n"}Approve the prompt on
              your phone if you see one.
            </Text>

            <View className="w-full mt-10 pt-6 border-t border-[#E5E9F0]">
              <View className="flex-row items-center justify-between py-1.5">
                <Text className="text-[13px] text-[#6B7280]">Amount</Text>
                <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                  ${amount} USD
                </Text>
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
