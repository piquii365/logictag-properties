import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Divider,
  ErrorView,
  Fab,
  Group,
  Header,
  LoadingView,
  Pills,
  SearchBar,
  Screen,
  StatusDot,
  StatusText,
} from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { getMaintenanceRequests } from "@/lib/queries";
import { isVendor } from "@/lib/roles";
import { useFetch } from "@/lib/useFetch";
import type { MaintenancePriority, MaintenanceStatus } from "@/lib/types";

const FILTERS = ["All", "Open", "In Progress", "Resolved"] as const;

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  quoted: "Quoted",
  approved: "Approved",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  cancelled: "Cancelled",
};

const priorityTone = (p: MaintenancePriority) =>
  p === "high" || p === "emergency" ? "red" : p === "medium" ? "amber" : "muted";

const statusTone = (s: MaintenanceStatus) =>
  s === "resolved" || s === "closed" ? "green" : s === "in_progress" ? "navy" : "amber";

function matchesFilter(status: MaintenanceStatus, filter: string) {
  if (filter === "All") return true;
  if (filter === "In Progress") return status === "in_progress" || status === "assigned" || status === "quoted" || status === "approved";
  return STATUS_LABEL[status] === filter;
}

export default function Maintenance() {
  const { user } = useAuth();
  const isVendorUser = isVendor(user?.role);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const { data, loading, error, refetch } = useFetch(getMaintenanceRequests);

  const list = (data ?? [])
    .filter((r) => matchesFilter(r.status, filter))
    .filter((r) => {
      const needle = q.trim().toLowerCase();
      const haystack = `${r.title} ${r.unit?.label ?? ""} ${r.unit?.property?.name ?? ""}`.toLowerCase();
      return !needle || haystack.includes(needle);
    })
    .sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1));

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header
        title="Maintenance"
        back={false}
        right="notifications-outline"
        badge
      />
      <Screen>
        <SearchBar
          placeholder="Search requests"
          value={q}
          onChangeText={setQ}
        />
        <View className="mb-4">
          <Pills options={FILTERS} value={filter} onChange={setFilter} />
        </View>

        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView message={error} onRetry={refetch} />
        ) : (
          <>
            <Group>
              {list.map((r, i) => (
                <View key={r.id}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/maintenance/[id]",
                        params: { id: r.id },
                      })
                    }
                    className="px-4 py-3.5 active:bg-[#F4F6F9]"
                  >
                    <View className="flex-row items-start justify-between">
                      <Text className="text-[15px] font-semibold text-[#0F2C4A] flex-1 pr-3">
                        {r.title}
                      </Text>
                      <StatusDot
                        text={r.priority}
                        tone={priorityTone(r.priority)}
                      />
                    </View>
                    <Text className="text-[12px] text-[#6B7280] mt-1">
                      {r.unit?.label ?? "—"} · {r.unit?.property?.name ?? "—"}
                    </Text>
                    <View className="flex-row items-center justify-between mt-2.5">
                      <Text className="text-[11px] text-[#94A3B8]">
                        {new Date(r.openedAt).toLocaleDateString()}
                      </Text>
                      <StatusText
                        text={STATUS_LABEL[r.status]}
                        tone={statusTone(r.status)}
                      />
                    </View>
                  </Pressable>
                </View>
              ))}
            </Group>

            {list.length === 0 ? (
              <Text className="text-center text-[13px] text-[#6B7280] mt-10">
                No requests match this filter.
              </Text>
            ) : null}
          </>
        )}
      </Screen>
      {!isVendorUser ? (
        <Fab onPress={() => router.push("/(tabs)/maintenance/new")} />
      ) : null}
    </View>
  );
}
