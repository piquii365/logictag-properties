import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import {
  ErrorView,
  Fab,
  Group,
  Header,
  LoadingView,
  Pills,
  SearchBar,
  Screen,
  StatusDot,
} from "@/components/ui";
import { getMyUnits, getProperties } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import { BASE_URL } from "@/lib/api";
import type { Property, Unit } from "@/lib/types";

const FALLBACK_THUMB = require("@/assets/images/bg1.jpg");

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

function PropertyRow({ p, units }: { p: Property; units: Unit[] }) {
  const { total, occupancy } = unitStats(units);
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/(tabs)/properties/[id]",
          params: { id: p.id },
        })
      }
      className="flex-row items-stretch active:bg-[#F8FAFC]"
    >
      {/* Full-height square thumbnail, flush to the card edge. The Group's
          overflow-hidden clips its corners on the first/last row. */}
      <Image
        source={
          p.imageUrls?.[0]
            ? { uri: `${BASE_URL}${p.imageUrls[0]}` }
            : FALLBACK_THUMB
        }
        contentFit="cover"
        className="self-stretch bg-[#E5E9F0]"
        style={{ aspectRatio: 1 }}
      />
      <View className="flex-1 justify-center px-4 py-4">
        <Text className="text-[15px] font-semibold text-[#0F2C4A]">
          {p.name}
        </Text>
        <Text className="text-[12px] text-[#6B7280] mt-0.5">{p.address}</Text>
        <Text className="text-[12px] text-[#6B7280] mt-0.5">
          {total} Unit{total === 1 ? "" : "s"} · {occupancy}% occupied
        </Text>
      </View>
      <View className="justify-center pr-4">
        <StatusDot
          text={p.active ? "Active" : "Inactive"}
          tone={p.active ? "green" : "muted"}
        />
      </View>
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
          <Group>
            {list.map((p, i) => (
              <View key={p.id} className={i ? "border-t border-[#E5E9F0]" : ""}>
                <PropertyRow p={p} units={unitsByProperty.get(p.id) ?? []} />
              </View>
            ))}
          </Group>
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
