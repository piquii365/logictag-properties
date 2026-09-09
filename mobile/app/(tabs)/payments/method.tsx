import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, Header, Screen } from "@/components/ui";
import { paymentMethods } from "@/lib/data";

export default function SelectMethod() {
  const { amount, tenantId, leaseId } = useLocalSearchParams<{
    amount?: string;
    tenantId?: string;
    leaseId?: string;
  }>();
  const [selected, setSelected] = useState<string>(paymentMethods[0].id);

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Select Payment Method" />
      <Screen>
        <View className="gap-3">
          {paymentMethods.map((m) => {
            const active = selected === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setSelected(m.id)}
                className={`flex-row items-center bg-white rounded-2xl border p-4 ${
                  active ? "border-[#F96B1F]" : "border-[#E5E9F0]"
                }`}
              >
                <View
                  className="h-10 w-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${m.tint}1A` }}
                >
                  <Ionicons name={m.icon} size={20} color={m.tint} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-[#0F2C4A]">{m.name}</Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">{m.hint}</Text>
                </View>
                <View
                  className={`h-5 w-5 rounded-full border-2 items-center justify-center ${
                    active ? "border-[#F96B1F]" : "border-[#CBD5E1]"
                  }`}
                >
                  {active ? <View className="h-2.5 w-2.5 rounded-full bg-[#F96B1F]" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Btn
          label="Continue"
          className="mt-6"
          onPress={() =>
            router.push({
              pathname: "/(tabs)/payments/ecocash",
              params: { amount, method: selected, tenantId, leaseId },
            })
          }
        />
      </Screen>
    </View>
  );
}
