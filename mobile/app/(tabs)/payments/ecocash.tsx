import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Btn, Field, Header, Screen } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { money, paymentMethods } from "@/lib/data";
import { createPayment } from "@/lib/queries";
import type { PaymentMethod } from "@/lib/types";

const METHOD_MAP: Record<string, PaymentMethod> = {
  ecocash: "mobile_money",
  innbucks: "mobile_money",
  card: "card",
  bank: "bank_transfer",
};

export default function EcoCashPayment() {
  const {
    amount = "0.00",
    method = "ecocash",
    tenantId,
    leaseId,
  } = useLocalSearchParams<{
    amount?: string;
    method?: string;
    tenantId?: string;
    leaseId?: string;
  }>();
  const m = paymentMethods.find((x) => x.id === method) ?? paymentMethods[0];

  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setError(null);
    if (!tenantId) {
      setError("Missing tenant — go back and start again.");
      return;
    }
    setSubmitting(true);
    try {
      const amountMinor = String(Math.round(Number(amount) * 100));
      const payment = await createPayment({
        tenantId,
        leaseId: leaseId || undefined,
        amountMinor,
        method: METHOD_MAP[method] ?? "mobile_money",
        provider: "pesepay",
      });
      router.push({
        pathname: "/(tabs)/payments/processing",
        params: { paymentId: payment.id, amount, leaseId },
      });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title={`${m.name} Payment`} />
      <Screen>
        <Field label="Amount" value={amount} editable={false} hint="USD" />
        <Field
          label={`${m.name} Number`}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="0771 234 567"
        />
        <Field
          label="Reference (optional)"
          value={reference}
          onChangeText={setReference}
          placeholder="e.g. Rent for this month"
        />

        <View className="flex-row items-start bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-3.5 mb-6">
          <Ionicons name="information-circle-outline" size={18} color="#C2410C" />
          <Text className="text-[13px] text-[#9A3412] ml-2 flex-1 leading-5">
            You will be prompted on your phone to approve the payment.
          </Text>
        </View>

        {error ? <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text> : null}

        <Btn
          label={submitting ? "Starting..." : `Pay ${money(Number(amount))}`}
          disabled={submitting}
          onPress={handlePay}
        />
      </Screen>
    </View>
  );
}
