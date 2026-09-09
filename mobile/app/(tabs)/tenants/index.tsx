import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Avatar,
  ErrorView,
  Fab,
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
          <View className="rounded-2xl border border-[#E5E9F0] overflow-hidden bg-white mt-1">
            {list.map((u, i) => (
              <Pressable
                key={u.id}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/tenants/[id]",
                    params: { id: u.id },
                  })
                }
                className={`flex-row items-center px-4 py-3.5 transition-transform duration-100 ease-out active:scale-[0.98] active:bg-[#F8FAFC] ${
                  i ? "border-t border-[#E5E9F0]" : ""
                }`}
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
            ))}
            {list.length === 0 ? (
              <Text className="text-center text-[13px] text-[#6B7280] py-8">
                {occupied.length === 0
                  ? "No tenants yet."
                  : "No tenants match your search."}
              </Text>
            ) : null}
          </View>
        )}
      </Screen>
      <Fab onPress={() => router.push("/(tabs)/tenants/new")} />
    </View>
  );
}
