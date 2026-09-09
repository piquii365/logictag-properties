import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Btn, Divider, Group, Header, KV, Screen } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import {
  allocatePaymentToLease,
  createPayment,
  updatePaymentStatus,
  uploadPaymentProof,
} from "@/lib/queries";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  mobile_money: "Mobile Money",
  card: "Card",
};

export default function ConfirmPayment() {
  const p = useLocalSearchParams<{
    tenantId?: string;
    tenantName?: string;
    leaseId?: string;
    amount?: string;
    method?: string;
    reference?: string;
    proofUri?: string;
    proofName?: string;
    proofType?: string;
  }>();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    if (!p.tenantId || !p.amount || !p.method) {
      setError("Missing payment details — go back and try again.");
      return;
    }
    setSubmitting(true);
    try {
      const amountMinor = String(Math.round(Number(p.amount) * 100));
      const payment = await createPayment({
        tenantId: p.tenantId,
        leaseId: p.leaseId || undefined,
        amountMinor,
        method: p.method as never,
        provider: "manual",
      });
      const confirmed = await updatePaymentStatus(payment.id, "succeeded");
      if (p.leaseId) {
        await allocatePaymentToLease(confirmed.id, p.leaseId, amountMinor);
      }
      if (p.proofUri) {
        await uploadPaymentProof(confirmed.id, {
          uri: p.proofUri,
          name: p.proofName || `proof-${Date.now()}.jpg`,
          type: p.proofType || "image/jpeg",
        });
      }
      router.replace({
        pathname: "/(tabs)/payments/success",
        params: {
          paymentId: confirmed.id,
          amount: p.amount,
          reference: confirmed.merchantReference,
          date: new Date(
            confirmed.paidAt ?? confirmed.createdAt,
          ).toLocaleString(),
          tenantName: p.tenantName ?? "",
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
      <Header title="Confirm Payment" />
      <Screen>
        <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-3">
          Review payment details
        </Text>

        <Group>
          <View className="px-4">
            <KV k="Tenant" v={p.tenantName ?? "—"} />
          </View>
          <Divider />
          <View className="px-4">
            <KV k="Amount" v={`$${p.amount ?? "0.00"} USD`} />
          </View>
          <Divider />
          <View className="px-4">
            <KV
              k="Payment Method"
              v={METHOD_LABEL[p.method ?? ""] ?? p.method ?? "—"}
            />
          </View>
          <Divider />
          <View className="px-4">
            <KV k="Reference" v={p.reference || "—"} />
          </View>
          {p.proofUri ? (
            <>
              <Divider />
              <View className="px-4">
                <KV k="Proof of payment" v="Attached" />
              </View>
            </>
          ) : null}
        </Group>

        {error ? (
          <Text className="text-[13px] text-[#DC2626] mt-4">{error}</Text>
        ) : null}

        <View className="flex-row gap-3 mt-6">
          <Btn
            label="Cancel"
            variant="outline"
            className="flex-1"
            onPress={() => router.back()}
            disabled={submitting}
          />
          <Btn
            label={submitting ? "Confirming..." : "Confirm Payment"}
            className="flex-1"
            disabled={submitting}
            onPress={handleConfirm}
          />
        </View>
      </Screen>
    </View>
  );
}
