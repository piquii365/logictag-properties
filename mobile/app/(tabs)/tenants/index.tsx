import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Avatar,
  Divider,
  ErrorView,
  Fab,
  Group,
  Header,
  LoadingView,
  SearchBar,
  Screen,
} from "@/components/ui";
import { getMyUnits } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

export default function Tenants() {
  const [q, setQ] = useState("");
  const { data, loading, error, refetch } = useFetch(getMyUnits);

  const occupied = (data ?? []).filter((u) => u.tenant);
  const list = occupied.filter((u) => {
    const needle = q.trim().toLowerCase();
    return (
      !needle ||
      `${u.tenant?.name ?? ""} ${u.label} ${u.property?.name ?? ""}`
        .toLowerCase()
        .includes(needle)
    );
  });

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Tenants" />
      <Screen>
        <SearchBar placeholder="Search tenants" value={q} onChangeText={setQ} />

        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView message={error} onRetry={refetch} />
        ) : (
          <Group className="mt-1">
            {list.map((u, i) => (
              <View key={u.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/tenants/[id]",
                      params: { id: u.id },
                    })
                  }
                  className="flex-row items-center px-4 py-3.5 active:bg-[#F4F6F9]"
                >
                  <Avatar
                    initials={(u.tenant?.name ?? "?")
                      .split(" ")
                      .map((s) => s[0])
                      .join("")
                      .toUpperCase()}
                    size={40}
                  />
                  <View className="flex-1 ml-3">
                    <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                      {u.tenant?.name}
                    </Text>
                    <Text className="text-[12px] text-[#6B7280] mt-0.5">
                      {u.label} · {u.property?.name ?? "—"}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ))}
            {list.length === 0 ? (
              <Text className="text-center text-[13px] text-[#6B7280] py-8">
                {occupied.length === 0
                  ? "No tenants yet."
                  : "No tenants match your search."}
              </Text>
            ) : null}
          </Group>
        )}
      </Screen>
      <Fab onPress={() => router.push("/(tabs)/tenants/new")} />
    </View>
  );
}
