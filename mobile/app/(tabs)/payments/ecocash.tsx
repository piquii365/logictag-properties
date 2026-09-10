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

// Maps the app's payment-method ids to PesePay's gateway method codes.
const PESEPAY_METHOD_CODE: Record<string, string> = {
  ecocash: "PZW211",
  innbucks: "PZW212",
  card: "PZW201",
  bank: "PZW203",
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
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setError(`Enter the ${m.name} number that will approve the payment.`);
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
        params: {
          paymentId: payment.id,
          amount,
          leaseId,
          phoneNumber: digits,
          paymentMethodCode: PESEPAY_METHOD_CODE[method] ?? "PZW211",
        },
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

        <View className="flex-row items-start border border-[#E5E9F0] rounded-lg p-3.5 mb-6">
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#6B7280"
          />
          <Text className="text-[13px] text-[#6B7280] ml-2 flex-1 leading-5">
            You will be prompted on your phone to approve the payment.
          </Text>
        </View>

        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-4">{error}</Text>
        ) : null}

        <Btn
          label={submitting ? "Starting..." : `Pay ${money(Number(amount))}`}
          disabled={submitting}
          onPress={handlePay}
        />
      </Screen>
    </View>
  );
}
