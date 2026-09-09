import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Divider,
  ErrorView,
  Group,
  Header,
  LoadingView,
  Screen,
  StatusText,
} from "@/components/ui";
import { getLeases, getMyUnits } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { LeaseStatus } from "@/lib/types";

const STATUS_TONE: Record<LeaseStatus, "green" | "amber" | "muted" | "red"> = {
  active: "green",
  draft: "amber",
  expired: "muted",
  terminated: "red",
};

export default function Leases() {
  const leases = useFetch(getLeases);
  const units = useFetch(getMyUnits);

  const unitsById = useMemo(() => new Map((units.data ?? []).map((u) => [u.id, u])), [units.data]);
  const loading = leases.loading || units.loading;
  const error = leases.error ?? units.error;
  const list = [...(leases.data ?? [])].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Leases" />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              leases.refetch();
              units.refetch();
            }}
          />
        ) : list.length === 0 ? (
          <Text className="text-center text-[13px] text-[#6B7280] mt-10">
            No leases yet.
          </Text>
        ) : (
          <Group>
            {list.map((l, i) => {
              const unit = unitsById.get(l.unitId);
              return (
                <View key={l.id}>
                  {i > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/tenants/[id]",
                        params: { id: l.unitId },
                      })
                    }
                    className="px-4 py-3.5 active:bg-[#F4F6F9]"
                  >
                    <View className="flex-row items-start justify-between">
                      <Text className="text-[14px] font-semibold text-[#0F2C4A] flex-1 pr-3">
                        {l.reference}
                      </Text>
                      <StatusText
                        text={l.status}
                        tone={STATUS_TONE[l.status]}
                      />
                    </View>
                    <Text className="text-[12px] text-[#6B7280] mt-0.5">
                      {unit
                        ? `${unit.label} · ${unit.property?.name ?? ""}`
                        : "—"}
                    </Text>
                    <Text className="text-[12px] text-[#6B7280] mt-0.5">
                      {l.startDate} - {l.endDate ?? "ongoing"} · $
                      {(Number(l.rentAmountMinor) / 100).toFixed(2)}/
                      {l.currency}
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
