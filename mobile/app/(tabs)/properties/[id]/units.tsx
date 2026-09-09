import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  ErrorView,
  Fab,
  Header,
  LoadingView,
  Pills,
  SearchBar,
  Screen,
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
          <View className="rounded-2xl border border-[#E5E9F0] overflow-hidden bg-white">
            {list.map((u: Unit, i) => (
              <Pressable
                key={u.id}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/properties/units/[unitId]",
                    params: { unitId: u.id },
                  })
                }
                className={`flex-row items-center px-4 py-3.5 transition-transform duration-100 ease-out active:scale-[0.98] active:bg-[#F8FAFC] ${
                  i ? "border-t border-[#E5E9F0]" : ""
                }`}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={24}
                  color={u.status === "vacant" ? "#94A3B8" : "#F96B1F"}
                  style={{ marginRight: 10 }}
                />
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                    {u.label}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    {u.tenant?.name ?? "Vacant"}
                  </Text>
                </View>
                <Text className="text-[14px] font-semibold text-[#0F2C4A] mr-3">
                  ${u.rent}
                </Text>
              </Pressable>
            ))}
            {list.length === 0 ? (
              <Text className="text-center text-[13px] text-[#6B7280] py-8">
                No units found.
              </Text>
            ) : null}
          </View>
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
