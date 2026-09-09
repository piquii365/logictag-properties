import { router } from "expo-router";
import { Text, View } from "react-native";
import { Header, Row, Screen } from "@/components/ui";
import { SELF_ASSIGNABLE_ROLES } from "@/lib/roles";

export default function SelectRole() {
  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="" />
      <Screen>
        <Text className="text-[26px] font-bold text-[#0F2C4A]">Select your role</Text>
        <Text className="text-[14px] text-[#6B7280] mt-1 mb-6 leading-5">
          This helps us personalize your experience
        </Text>

        <View className="gap-3">
          {SELF_ASSIGNABLE_ROLES.map((r) => (
            <View key={r.id} className="rounded-2xl border border-[#E5E9F0] overflow-hidden">
              <Row
                icon={r.icon}
                title={r.title}
                sub={r.sub}
                onPress={() =>
                  router.push({ pathname: "/(auth)/sign-up", params: { role: r.id } })
                }
              />
            </View>
          ))}
        </View>
      </Screen>
    </View>
  );
}
