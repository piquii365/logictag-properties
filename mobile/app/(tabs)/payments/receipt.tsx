import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Btn, Card, Header, KV, Screen, StatusIcon } from "@/components/ui";

export default function Receipt() {
  const { amount = "0.00", reference, date } = useLocalSearchParams<{
    amount?: string;
    reference?: string;
    date?: string;
  }>();

  return (
    <View className="flex-1 bg-[#F0FDF4]">
      <Header title="Payment Successful" back={false} />
      <Screen bg="#F0FDF4">
        <View className="mt-10 mb-6">
          <StatusIcon icon="checkmark" />
        </View>

        <Text className="text-[22px] font-bold text-[#0F2C4A] text-center">
          Payment Successful!
        </Text>
        <Text className="text-[13px] text-[#6B7280] text-center mt-2 mb-8">
          Your payment has been confirmed.
        </Text>

        <Card>
          <KV k="Amount Paid" v={`$${amount} USD`} tone="#16A34A" />
          <KV k="Reference" v={reference ?? "—"} />
          <KV k="Date" v={date ?? "—"} />
        </Card>

        <Btn
          label="View Statement"
          className="mt-8"
          onPress={() => router.replace("/(tabs)/payments")}
        />
        <Pressable className="mt-5" onPress={() => router.replace("/(tabs)/dashboard")}>
          <Text className="text-[14px] text-[#F96B1F] font-semibold text-center">Back to Home</Text>
        </Pressable>
      </Screen>
    </View>
  );
}
