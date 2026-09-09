import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { Pressable } from "react-native";
import {
  ErrorView,
  Fab,
  Header,
  LoadingView,
  Screen,
  type Icon,
} from "@/components/ui";
import { getProperties, getUtilities } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import { useAuth } from "@/lib/auth";

const TYPE_ICON: Record<string, Icon> = {
  electricity: "flash-outline",
  water: "water-outline",
  gas: "flame-outline",
};

export default function Utilities() {
  const { propertyId } = useLocalSearchParams<{ propertyId?: string }>();
  const { user } = useAuth();
  const canManage =
    user?.role === "landlord" || user?.role === "property_manager";
  const utilities = useFetch(getUtilities);
  const properties = useFetch(getProperties);

  const propertiesById = useMemo(
    () => new Map((properties.data ?? []).map((p) => [p.id, p])),
    [properties.data],
  );
  const loading = utilities.loading || properties.loading;
  const error = utilities.error ?? properties.error;
  const visibleUtilities = propertyId
    ? (utilities.data ?? []).filter(
        (utility) => utility.propertyId === propertyId,
      )
    : (utilities.data ?? []);

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Utilities" />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              utilities.refetch();
              properties.refetch();
            }}
          />
        ) : visibleUtilities.length === 0 ? (
          <Text className="text-center text-[13px] text-[#6B7280] mt-10">
            No utilities set up yet.
          </Text>
        ) : (
          <View className="rounded-2xl border border-[#E5E9F0] overflow-hidden bg-white">
            {visibleUtilities.map((u, i) => (
              <Pressable
                key={u.id}
                onPress={
                  canManage
                    ? () =>
                        router.push({
                          pathname: "/(tabs)/utilities/charge",
                          params: { utilityId: u.id },
                        })
                    : undefined
                }
                className={`flex-row items-center px-4 py-3.5 ${i ? "border-t border-[#E5E9F0]" : ""}`}
              >
                <Ionicons
                  name={TYPE_ICON[u.type] ?? "flash-outline"}
                  size={20}
                  color="#F96B1F"
                  style={{ marginRight: 12 }}
                />
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                    {u.name}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    {propertiesById.get(u.propertyId)?.name ?? "—"} ·{" "}
                    {u.billingMethod}
                  </Text>
                </View>
                <Text
                  className="text-[12px] font-medium"
                  style={{ color: u.isActive ? "#16A34A" : "#94A3B8" }}
                >
                  {u.isActive ? "Active" : "Inactive"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </Screen>
      {canManage ? (
        <Fab
          onPress={() =>
            router.push({
              pathname: "/(tabs)/utilities/new",
              params: propertyId ? { propertyId } : undefined,
            })
          }
        />
      ) : null}
    </View>
  );
}
