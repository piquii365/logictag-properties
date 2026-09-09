import { router } from "expo-router";
import { Text, View } from "react-native";
import {
  Avatar,
  Divider,
  Group,
  Header,
  Row,
  Screen,
  SectionTitle,
} from "@/components/ui";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isManagementRole, roleLabel } from "@/lib/roles";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") +
    (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")
  );
}

export default function More() {
  const { user, signOut } = useAuth();
  const isManagement = isManagementRole(user?.role);
  const isAdmin = user?.role === "admin";

  async function handleSignOut() {
    await signOut();
    // Belt-and-suspenders: the Stack.Protected guard also redirects once
    // `user` clears, this just makes it immediate.
    router.replace("/");
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="More" back={false} />
      <Screen>
        <View className="flex-row items-center py-2">
          <Avatar
            initials={user ? initialsOf(user.name).toUpperCase() : "?"}
            size={52}
            uri={user?.avatarUrl ? `${BASE_URL}${user.avatarUrl}` : undefined}
          />
          <View className="ml-3 flex-1">
            <Text className="text-[16px] font-semibold text-[#0F2C4A]">
              {user?.name}
            </Text>
            <Text className="text-[12px] text-[#6B7280] mt-0.5">
              {user?.email}
            </Text>
            <Text className="text-[12px] text-[#F96B1F] mt-0.5">
              {user ? roleLabel(user.role) : ""}
            </Text>
          </View>
        </View>

        {isManagement ? (
          <>
            <SectionTitle>Management</SectionTitle>
            <Group>
              <Row
                icon="people-outline"
                title="Tenants"
                onPress={() => router.push("/(tabs)/tenants")}
              />
              <Divider />
              <Row
                icon="briefcase-outline"
                title="Vendors"
                onPress={() => router.push("/(tabs)/vendors")}
              />
              <Divider />
              <Row
                icon="document-text-outline"
                title="Leases"
                onPress={() => router.push("/(tabs)/leases")}
              />
              <Divider />
              <Row
                icon="flash-outline"
                title="Utilities"
                onPress={() => router.push("/(tabs)/utilities")}
              />
              <Divider />
              <Row
                icon="bar-chart-outline"
                title="Reports"
                onPress={() => router.push("/(tabs)/reports")}
              />
              <Divider />
              <Row
                icon="card-outline"
                title="Subscription"
                onPress={() => router.push("/(tabs)/subscriptions")}
              />
              <Divider />
              <Row
                icon="sparkles-outline"
                title="Insights"
                onPress={() => router.push("/(tabs)/insights")}
              />
              <Divider />
              <Row
                icon="shield-checkmark-outline"
                title="Compliance"
                onPress={() => router.push("/(tabs)/compliance")}
              />
            </Group>
          </>
        ) : null}

        {isAdmin ? (
          <>
            <SectionTitle>Admin</SectionTitle>
            <Group>
              <Row
                icon="settings-outline"
                title="Admin Console"
                sub="Users, subscriptions, payments, audit & system"
                onPress={() => router.push("/(tabs)/admin")}
              />
            </Group>
          </>
        ) : null}

        <SectionTitle>Account</SectionTitle>
        <Group>
          <Row
            icon="person-outline"
            title="Profile"
            onPress={() => router.push("/(tabs)/profile")}
          />
          <Divider />
          <Row
            icon="notifications-outline"
            title="Notifications"
            onPress={() => router.push("/(tabs)/notifications")}
          />
          <Divider />
          <Row
            icon="lock-closed-outline"
            title="Security"
            onPress={() => router.push("/(tabs)/security")}
          />
          <Divider />
          <Row
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() => router.push("/(tabs)/help")}
          />
          <Divider />
          <Row
            icon="log-out-outline"
            iconTint="#DC2626"
            title="Sign out"
            chevron={false}
            onPress={handleSignOut}
          />
        </Group>
      </Screen>
    </View>
  );
}
