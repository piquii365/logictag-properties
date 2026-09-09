import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, View } from "react-native";
import {
  Divider,
  ErrorView,
  Group,
  Header,
  LoadingView,
  Screen,
  SearchBar,
  StatusDot,
} from "@/components/ui";
import { getVendors } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { VendorStatus } from "@/lib/types";

const STATUS_TONE: Record<VendorStatus, "green" | "amber" | "red" | "muted"> = {
  approved: "green",
  pending: "amber",
  suspended: "red",
  rejected: "red",
};

export default function Vendors() {
  const [q, setQ] = useState("");
  const { data, loading, error, refetch } = useFetch(getVendors);

  const list = (data ?? []).filter((v) => {
    const needle = q.trim().toLowerCase();
    return !needle || `${v.name} ${v.city}`.toLowerCase().includes(needle);
  });

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Vendors" />
      <Screen>
        <SearchBar placeholder="Search vendors" value={q} onChangeText={setQ} />

        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView message={error} onRetry={refetch} />
        ) : list.length === 0 ? (
          <Text className="text-center text-[13px] text-[#6B7280] mt-10">
            No vendors yet.
          </Text>
        ) : (
          <Group>
            {list.map((v, i) => (
              <View key={v.id}>
                {i > 0 ? <Divider /> : null}
                <View className="px-4 py-3.5">
                  <View className="flex-row items-start justify-between">
                    <Text className="text-[15px] font-semibold text-[#0F2C4A] flex-1 pr-3">
                      {v.name}
                    </Text>
                    <StatusDot text={v.status} tone={STATUS_TONE[v.status]} />
                  </View>
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="call-outline" size={13} color="#6B7280" />
                    <Text className="text-[13px] text-[#0F2C4A] ml-1.5">
                      {v.contactPhone}
                    </Text>
                  </View>
                  <View className="flex-row items-center mt-1">
                    <Ionicons
                      name="location-outline"
                      size={13}
                      color="#6B7280"
                    />
                    <Text className="text-[13px] text-[#0F2C4A] ml-1.5">
                      {v.city}
                    </Text>
                  </View>
                  {v.ratingsCount > 0 ? (
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="star" size={13} color="#F59E0B" />
                      <Text className="text-[13px] text-[#0F2C4A] ml-1.5">
                        {v.rating} ({v.ratingsCount} rating
                        {v.ratingsCount === 1 ? "" : "s"}) · {v.jobsCompleted}{" "}
                        job{v.jobsCompleted === 1 ? "" : "s"} completed
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </Group>
        )}
      </Screen>
    </View>
  );
}
