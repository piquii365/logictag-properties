import { router } from "expo-router";
import { Text, View } from "react-native";
import {
  Card,
  Divider,
  ErrorView,
  Header,
  LoadingView,
  Row,
  Screen,
  SectionTitle,
} from "@/components/ui";
import { getSystemOverview } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

function Stat({
  label,
  value,
  accent = "#0F2C4A",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-[#E5E9F0] bg-white p-3">
      <Text className="text-[22px] font-bold" style={{ color: accent }}>
        {value}
      </Text>
      <Text className="text-[11px] text-[#6B7280] mt-0.5">{label}</Text>
    </View>
  );
}

export default function AdminConsole() {
  const overview = useFetch(getSystemOverview);
  const counts = overview.data?.counts;

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Admin Console" />
      <Screen>
        {overview.loading ? (
          <LoadingView />
        ) : overview.error ? (
          <ErrorView message={overview.error} onRetry={overview.refetch} />
        ) : (
          <>
            <SectionTitle>System overview</SectionTitle>
            <View className="flex-row gap-2 mb-2">
              <Stat label="Users" value={counts?.users ?? 0} />
              <Stat
                label="Properties"
                value={counts?.properties ?? 0}
                accent="#F96B1F"
              />
            </View>
            <View className="flex-row gap-2 mb-2">
              <Stat label="Units" value={counts?.units ?? 0} />
              <Stat
                label="Subscriptions"
                value={counts?.subscriptions ?? 0}
                accent="#16A34A"
              />
            </View>
            <View className="flex-row gap-2 mb-2">
              <Stat label="Plans" value={counts?.subscriptionPlans ?? 0} />
              <Stat
                label="Sub payments"
                value={counts?.subscriptionPayments ?? 0}
                accent="#F96B1F"
              />
            </View>
            <View className="flex-row gap-2 mb-2">
              <Stat label="Payments" value={counts?.payments ?? 0} />
              <Stat
                label="Audit events"
                value={counts?.auditLogs ?? 0}
                accent="#16A34A"
              />
            </View>

            {overview.data?.runtime ? (
              <Card className="mt-2">
                <Text className="text-[13px] text-[#6B7280] mb-2">Runtime</Text>
                <View className="flex-row justify-between py-1">
                  <Text className="text-[13px] text-[#6B7280]">Node</Text>
                  <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                    {overview.data.runtime.node}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-[13px] text-[#6B7280]">Platform</Text>
                  <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                    {overview.data.runtime.platform}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-[13px] text-[#6B7280]">Uptime</Text>
                  <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                    {Math.floor(overview.data.runtime.uptimeSeconds / 60)} min
                  </Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-[13px] text-[#6B7280]">Memory</Text>
                  <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                    {overview.data.runtime.memoryMb} MB
                  </Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-[13px] text-[#6B7280]">Env</Text>
                  <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                    {overview.data.runtime.env}
                  </Text>
                </View>
              </Card>
            ) : null}

            <SectionTitle>Manage</SectionTitle>
            <View className="rounded-2xl border border-[#E5E9F0] overflow-hidden">
              <Row
                icon="people-outline"
                title="Users"
                sub="Directory, roles & account status"
                onPress={() => router.push("/(tabs)/admin/users")}
              />
              <Divider />
              <Row
                icon="card-outline"
                title="Subscription plans"
                sub="Add, edit & remove plans"
                onPress={() => router.push("/(tabs)/admin/plans")}
              />
              <Divider />
              <Row
                icon="layers-outline"
                title="Subscriptions"
                sub="Assign & manage user subscriptions"
                onPress={() => router.push("/(tabs)/admin/subscriptions")}
              />
              <Divider />
              <Row
                icon="card-outline"
                title="Subscription payments"
                sub="All plan payments across accounts"
                onPress={() =>
                  router.push("/(tabs)/admin/subscription-payments")
                }
              />
              <Divider />
              <Row
                icon="shield-checkmark-outline"
                title="Audit log"
                sub="Who did what, when"
                onPress={() => router.push("/(tabs)/admin/audit")}
              />
            </View>
          </>
        )}
      </Screen>
    </View>
  );
}
