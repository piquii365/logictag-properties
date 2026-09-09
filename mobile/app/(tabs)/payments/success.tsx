import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Btn, Card, Header, KV, Screen, StatusIcon } from "@/components/ui";

export default function PaymentRecorded() {
  const { amount, reference, date, tenantName } = useLocalSearchParams<{
    amount?: string;
    reference?: string;
    date?: string;
    tenantName?: string;
  }>();

  return (
    <View className="flex-1 bg-[#F0FDF4]">
      <Header title="" back={false} />
      <Screen bg="#F0FDF4">
        <View className="mt-6 mb-6">
          <StatusIcon icon="checkmark" />
        </View>

        <Text className="text-[24px] font-bold text-[#0F2C4A] text-center">
          Payment Recorded Successfully!
        </Text>
        <Text className="text-[30px] font-bold text-[#16A34A] text-center mt-4">
          ${amount ?? "0.00"} <Text className="text-[16px] text-[#6B7280]">USD</Text>
        </Text>
        {tenantName ? (
          <Text className="text-[13px] text-[#6B7280] text-center mt-2 mb-8">
            has been recorded for <Text className="font-semibold text-[#0F2C4A]">{tenantName}</Text>
          </Text>
        ) : (
          <View className="mb-8" />
        )}

        <Card>
          <KV k="Reference" v={reference ?? "—"} />
          <KV k="Date" v={date ?? "—"} />
        </Card>

        <Btn
          label="Back to Payments"
          className="mt-6"
          onPress={() => router.replace("/(tabs)/payments")}
        />
        <Pressable className="mt-5" onPress={() => router.replace("/(tabs)/payments/record")}>
          <Text className="text-[14px] text-[#F96B1F] font-semibold text-center">
            Record Another Payment
          </Text>
        </Pressable>
      </Screen>
    </View>
  );
}
