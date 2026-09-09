import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  ErrorView,
  Fab,
  Group,
  Header,
  LoadingView,
  Pills,
  SearchBar,
  Screen,
  StatusText,
} from "@/components/ui";
import { getPropertyUnits } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { Unit, UnitStatus } from "@/lib/types";

const FILTERS = ["All", "Occupied", "Vacant", "Maintenance"] as const;
const STATUS_LABEL: Record<UnitStatus, string> = {
  occupied: "Occupied",
  vacant: "Vacant",
  maintenance: "Maintenance",
};
const STATUS_TONE: Record<UnitStatus, "green" | "muted" | "amber"> = {
  occupied: "green",
  vacant: "muted",
  maintenance: "amber",
};

export default function Units() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("All");

  // id can be momentarily undefined on the very first render — never
  // template that into a URL as the literal string "undefined".
  const { data, loading, error, refetch } = useFetch(
    () => (id ? getPropertyUnits(id) : Promise.resolve([])),
    [id],
  );

  const list = (data ?? [])
    .filter((u) => filter === "All" || STATUS_LABEL[u.status] === filter)
    .filter((u) => {
      const needle = q.trim().toLowerCase();
      return (
        !needle ||
        `${u.label} ${u.tenant?.name ?? ""}`.toLowerCase().includes(needle)
      );
    });

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Units" right="grid-outline" />
      <Screen>
        <SearchBar placeholder="Search units" value={q} onChangeText={setQ} />
        <View className="mb-4">
          <Pills options={FILTERS} value={filter} onChange={setFilter} />
        </View>

        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView message={error} onRetry={refetch} />
        ) : (
          <Group>
            {list.map((u: Unit, i) => (
              <Pressable
                key={u.id}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/properties/units/[unitId]",
                    params: { unitId: u.id },
                  })
                }
                className={`flex-row items-center px-4 py-3.5 active:bg-[#F8FAFC] ${
                  i ? "border-t border-[#E5E9F0]" : ""
                }`}
              >
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                    {u.label}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    {u.tenant?.name ?? "Vacant"}
                  </Text>
                </View>
                <Text className="text-[14px] font-semibold text-[#0F2C4A] mr-4">
                  ${u.rent}
                </Text>
                <StatusText
                  text={STATUS_LABEL[u.status]}
                  tone={STATUS_TONE[u.status]}
                />
              </Pressable>
            ))}
            {list.length === 0 ? (
              <Text className="text-center text-[13px] text-[#6B7280] py-8">
                No units found.
              </Text>
            ) : null}
          </Group>
        )}
      </Screen>
      <Fab
        onPress={() =>
          router.push({
            pathname: "/(tabs)/properties/[id]/add-unit",
            params: { id },
          })
        }
      />
    </View>
  );
}
