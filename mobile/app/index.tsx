import { Btn } from "@/components/ui";
import { router } from "expo-router";
import { Image, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Welcome() {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-[#0F2C4A]">
      <Image
        source={require("@/assets/images/bg1.jpg")}
        resizeMode="cover"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* ponytail: flat 55% navy scrim — enough contrast for white text, photo still reads */}
      <View
        className="bg-[#0F2C4A]/55"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />

      <View
        className="flex-1"
        style={{ paddingTop: top + 48, paddingBottom: bottom + 32 }}
      >
        <View className="flex-1 px-8 justify-center items-center">
          <Image
            source={require("@/assets/images/logo-mark.png")}
            resizeMode="contain"
            style={{ width: 160, height: 135, marginBottom: 40 }}
          />

          <Text className="text-white text-[34px] leading-[42px] font-bold text-center">
            Smarter property management, stronger returns.
          </Text>
          <Text className="text-[#C7D6E8] text-base leading-6 mt-4 text-center">
            Manage properties, tenants, payments, maintenance and more all in
            one place.
          </Text>
        </View>

        <View className="px-8 gap-3">
          <Btn label="Sign In" onPress={() => router.push("/(auth)/sign-in")} />
          <Btn
            label="Create Account"
            variant="light"
            onPress={() => router.push("/(auth)/select-role")}
          />
        </View>
      </View>
    </View>
  );
}
