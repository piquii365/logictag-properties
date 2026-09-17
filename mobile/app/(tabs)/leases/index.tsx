import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Btn,
  Divider,
  ErrorView,
  Group,
  Header,
  LoadingView,
  Screen,
  StatusText,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { getLeases, getMyUnits } from "@/lib/queries";
import { isManagementRole } from "@/lib/roles";
import type { LeaseStatus } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";

const STATUS_TONE: Record<LeaseStatus, "green" | "amber" | "muted" | "red"> = {
  active: "green",
  draft: "amber",
  expired: "muted",
  terminated: "red",
};

export default function Leases() {
  const { user } = useAuth();
  const isManager = isManagementRole(user?.role);

  const leases = useFetch(getLeases);
  // Only management roles have access to /properties/units; skip for tenants
  // to avoid the fetch hanging / 403-ing and blocking the whole screen.
  const units = useFetch(isManager ? getMyUnits : null);

  const [tab, setTab] = useState<"all" | LeaseStatus>("all");

  const unitsById = useMemo(
    () => new Map((units.data ?? []).map((u) => [u.id, u])),
    [units.data],
  );

  // If not a manager, units fetch is skipped so don't block on it
  const loading = leases.loading || (isManager ? units.loading : false);
  const error = leases.error ?? (isManager ? units.error : null);

  const rawList = leases.data ?? [];
  const filteredList = useMemo(() => {
    let res = [...rawList];
    if (tab !== "all") {
      res = res.filter((l) => l.status === tab);
    }
    return res.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }, [rawList, tab]);

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header
        title="Leases"
        right={isManager ? "add" : undefined}
        onRight={
          isManager ? () => router.push("/(tabs)/leases/create") : undefined
        }
      />
      <Screen>
        {/* Filter Pills */}
        <View className="flex-row gap-2 mb-4">
          {(["all", "draft", "active", "terminated"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`px-3 py-1.5 rounded-full border ${
                tab === t
                  ? "bg-[#0F2C4A] border-[#0F2C4A]"
                  : "bg-white border-[#E5E9F0]"
              }`}
            >
              <Text
                className={`text-[12px] font-medium capitalize ${
                  tab === t ? "text-white" : "text-[#6B7280]"
                }`}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              leases.refetch();
              if (isManager) units.refetch();
            }}
          />
        ) : filteredList.length === 0 ? (
          <View className="items-center justify-center py-12 px-4 bg-white rounded-xl border border-[#E5E9F0]">
            <Ionicons name="document-text-outline" size={40} color="#9CA3AF" />
            <Text className="text-center font-medium text-[15px] text-[#0F2C4A] mt-3">
              {tab === "all" ? "No leases found" : `No ${tab} leases`}
            </Text>
            <Text className="text-center text-[13px] text-[#6B7280] mt-1 mb-5">
              {isManager
                ? "Draft a new lease agreement for any unit in your properties."
                : "You do not have any lease agreements assigned."}
            </Text>
            {isManager ? (
              <Btn
                label="Draft New Lease"
                icon="add-outline"
                onPress={() => router.push("/(tabs)/leases/create")}
              />
            ) : null}
          </View>
        ) : (
          <Group>
            {filteredList.map((l, i) => {
              const unit = unitsById.get(l.unitId);
              return (
                <View key={l.id}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/leases/[id]",
                        params: { id: l.id },
                      })
                    }
                    className="px-4 py-3.5 active:bg-[#F4F6F9]"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-3">
                        <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                          {unit
                            ? `${unit.label} · ${unit.property?.name ?? ""}`
                            : l.reference}
                        </Text>
                        <Text className="text-[12px] text-[#6B7280] mt-0.5">
                          Ref: {l.reference}
                        </Text>
                      </View>
                      <StatusText
                        text={l.status}
                        tone={STATUS_TONE[l.status]}
                      />
                    </View>
                    <Text className="text-[12px] text-[#6B7280] mt-2">
                      {l.startDate} - {l.endDate ?? "ongoing"} ·{" "}
                      {(Number(l.rentAmountMinor) / 100).toFixed(2)}{" "}
                      {l.currency}
                      {l.frequency ? ` (${l.frequency})` : ""}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </Group>
        )}
      </Screen>
    </View>
  );
}
