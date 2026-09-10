import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth";

function RootNavigator() {
  const { user, booting } = useAuth();

  // Waiting on the initial silent /auth/refresh — show a blank navy splash
  // rather than flashing the welcome screen for a signed-in user.
  if (booting) {
    return (
      <View className="flex-1 items-center justify-center bg-[#0F2C4A]">
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F4F6F9" },
      }}
    >
      {/* Legal pages are readable whether or not you're signed in, so they sit
          outside both guards. */}

      <Stack.Protected guard={!user}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Screen name="legal" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
