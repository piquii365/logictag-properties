import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAuth } from "@/lib/auth";
import { C } from "@/lib/data";

function icon(name: keyof typeof Ionicons.glyphMap) {
  function TabIcon({ color, size }: { color: string; size: number }) {
    return <Ionicons name={name} size={size} color={color} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { user } = useAuth();
  const isTenant = user?.role === "tenant";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.orange,
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: C.border },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Home", tabBarIcon: icon("home") }}
      />
      <Tabs.Screen
        name="properties"
        options={{ title: "Properties", tabBarIcon: icon("business") }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{ title: "Maintenance", tabBarIcon: icon("construct") }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: "Pay Rent",
          tabBarIcon: icon("card"),
          href: isTenant ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", tabBarIcon: icon("grid") }}
      />
      {/* Reachable from tabs but not themselves tabs. */}
      <Tabs.Screen name="tenants" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="vendors" options={{ href: null }} />
      <Tabs.Screen name="leases" options={{ href: null }} />
      <Tabs.Screen name="utilities" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="security" options={{ href: null }} />
      <Tabs.Screen name="help" options={{ href: null }} />
      <Tabs.Screen name="insights" options={{ href: null }} />
      <Tabs.Screen name="compliance" options={{ href: null }} />
    </Tabs>
  );
}
