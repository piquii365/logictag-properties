import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, Group, Header, Screen } from "@/components/ui";
import { paymentMethods } from "@/lib/data";

// Brand logos for the specific providers. Bank Transfer has no brand mark,
// so it keeps its generic Ionicons glyph.
const BRAND_LOGO: Record<string, number> = {
  ecocash: require("@/assets/icons/EcoCash_logo.png"),
  innbucks: require("@/assets/icons/InnBucks_logo.png"),
  card: require("@/assets/icons/VisaMasterCard_logo.webp"),
};

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
        <Group>
          {paymentMethods.map((m, i) => {
            const active = selected === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => setSelected(m.id)}
                className={`flex-row items-center px-4 py-4 active:bg-[#F8FAFC] ${
                  i ? "border-t border-[#E5E9F0]" : ""
                }`}
              >
                {BRAND_LOGO[m.id] ? (
                  <View
                    className="h-8 w-12 items-center justify-center"
                    style={{ marginRight: 12 }}
                  >
                    <Image
                      source={BRAND_LOGO[m.id]}
                      contentFit="contain"
                      style={{ width: "100%", height: "100%" }}
                    />
                  </View>
                ) : (
                  <Ionicons
                    name={m.icon}
                    size={20}
                    color={active ? "#F96B1F" : "#0F2C4A"}
                    style={{ marginRight: 12 }}
                  />
                )}
                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                    {m.name}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    {m.hint}
                  </Text>
                </View>
                <View
                  className={`h-5 w-5 rounded-full border-2 items-center justify-center ${
                    active ? "border-[#F96B1F]" : "border-[#CBD5E1]"
                  }`}
                >
                  {active ? (
                    <View className="h-2.5 w-2.5 rounded-full bg-[#F96B1F]" />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </Group>

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
