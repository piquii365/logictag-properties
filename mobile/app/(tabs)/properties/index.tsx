import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  ErrorView,
  Fab,
  Header,
  LoadingView,
  Pills,
  SearchBar,
  Screen,
  StatusDot,
} from "@/components/ui";
import { getMyUnits, getProperties } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { Property, Unit } from "@/lib/types";

const FILTERS = ["All", "Active", "Inactive"] as const;

function unitStats(units: Unit[]) {
  const total = units.length;
  const occupied = units.filter((u) => u.status === "occupied").length;
  return {
    total,
    occupied,
    occupancy: total ? Math.round((occupied / total) * 100) : 0,
  };
}

function PropertyCard({ p, units }: { p: Property; units: Unit[] }) {
  const { total, occupancy } = unitStats(units);
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(tabs)/properties/[id]",
          params: { id: p.id },
        })
      }
      className="flex-row items-center bg-white border border-[#E5E9F0] rounded-2xl p-3 mb-3 transition-transform duration-100 ease-out active:scale-[0.98]"
    >
      <View className="h-14 w-14 rounded-xl bg-[#E2E8F0] items-center justify-center mr-3">
        <Ionicons name="business" size={26} color="#0F2C4A" />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-[#0F2C4A]">
          {p.name}
        </Text>
        <Text className="text-[12px] text-[#6B7280] mt-0.5">{p.address}</Text>
        <Text className="text-[12px] text-[#6B7280]">
          {total} Unit{total === 1 ? "" : "s"} · {occupancy}% Occupied
        </Text>
      </View>
      <StatusDot
        text={p.active ? "Active" : "Inactive"}
        tone={p.active ? "green" : "muted"}
      />
    </Pressable>
  );
}

export default function Properties() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("All");

  const properties = useFetch(getProperties);
  const units = useFetch(getMyUnits);

  const unitsByProperty = useMemo(() => {
    const map = new Map<string, Unit[]>();
    for (const u of units.data ?? []) {
      const list = map.get(u.propertyId) ?? [];
      list.push(u);
      map.set(u.propertyId, list);
    }
    return map;
  }, [units.data]);

  const list = (properties.data ?? []).filter((p) => {
    const matchesFilter =
      filter === "All" || (filter === "Active" ? p.active : !p.active);
    return (
      matchesFilter && p.name.toLowerCase().includes(q.trim().toLowerCase())
    );
  });

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Properties" back={false} right="filter-outline" />
      <Screen>
        <SearchBar
          placeholder="Search properties"
          value={q}
          onChangeText={setQ}
        />

        <View className="mb-4">
          <Pills options={FILTERS} value={filter} onChange={setFilter} />
        </View>

        {properties.loading ? (
          <LoadingView />
        ) : properties.error ? (
          <ErrorView message={properties.error} onRetry={properties.refetch} />
        ) : list.length ? (
          list.map((p) => (
            <PropertyCard
              key={p.id}
              p={p}
              units={unitsByProperty.get(p.id) ?? []}
            />
          ))
        ) : (
          <Text className="text-center text-[13px] text-[#6B7280] mt-10">
            No properties match this filter.
          </Text>
        )}
      </Screen>
      <Fab onPress={() => router.push("/(tabs)/properties/new")} />
    </View>
  );
}
