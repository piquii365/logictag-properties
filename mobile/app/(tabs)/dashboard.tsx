import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Bar, Card, ErrorView, Header, LoadingView, Screen } from "@/components/ui";
import { C, centsToDollars, money, moneyShort } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { getMyUnits, getProperties, getRentCharges } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card className="flex-1">
      <Text className="text-[26px] font-bold text-[#0F2C4A]">{value}</Text>
      <Text className="text-[12px] text-[#6B7280] mt-0.5">{label}</Text>
    </Card>
  );
}

const OUTSTANDING_STATUSES = new Set(["outstanding", "part_paid"]);
const DAY_MS = 24 * 60 * 60 * 1000;

export default function Dashboard() {
  const { user } = useAuth();
  const [scope, setScope] = useState("All Properties");
  const [open, setOpen] = useState(false);

  const properties = useFetch(getProperties);
  const units = useFetch(getMyUnits);
  const rentCharges = useFetch(getRentCharges);

  const loading = properties.loading || units.loading || rentCharges.loading;
  const error = properties.error ?? units.error ?? rentCharges.error;

  const occupancy = useMemo(() => {
    const list = units.data ?? [];
    if (!list.length) return 0;
    return Math.round((list.filter((u) => u.status === "occupied").length / list.length) * 100);
  }, [units.data]);

  const { collected, outstanding, arrears } = useMemo(() => {
    const charges = rentCharges.data ?? [];
    const collectedMinor = charges.reduce((s, c) => s + Number(c.allocatedMinor), 0);
    const now = Date.now();
    const buckets = { "0-30 Days": 0, "31-60 Days": 0, "60+ Days": 0 };
    let outstandingMinor = 0;
    for (const c of charges) {
      if (!OUTSTANDING_STATUSES.has(c.status)) continue;
      const owed = Number(c.amountMinor) - Number(c.allocatedMinor);
      if (owed <= 0) continue;
      outstandingMinor += owed;
      const daysOverdue = Math.floor((now - new Date(c.dueDate).getTime()) / DAY_MS);
      if (daysOverdue <= 30) buckets["0-30 Days"] += owed;
      else if (daysOverdue <= 60) buckets["31-60 Days"] += owed;
      else buckets["60+ Days"] += owed;
    }
    return {
      collected: centsToDollars(collectedMinor),
      outstanding: centsToDollars(outstandingMinor),
      arrears: [
        { label: "0-30 Days", amount: centsToDollars(buckets["0-30 Days"]), color: C.amber },
        { label: "31-60 Days", amount: centsToDollars(buckets["31-60 Days"]), color: "#EA580C" },
        { label: "60+ Days", amount: centsToDollars(buckets["60+ Days"]), color: C.red },
      ],
    };
  }, [rentCharges.data]);

  const collectionRate =
    collected + outstanding > 0 ? Math.round((collected / (collected + outstanding)) * 100) : 0;

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header
        title="Dashboard"
        back={false}
        right="notifications-outline"
        badge
        onRight={() => router.push("/(tabs)/notifications")}
      />
      <Screen>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          className="flex-row items-center justify-between bg-white border border-[#E5E9F0] rounded-xl px-4 py-3.5"
        >
          <Text className="text-[15px] text-[#0F2C4A]">{scope}</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#6B7280" />
        </Pressable>
        {open ? (
          <View className="bg-white border border-[#E5E9F0] rounded-xl mt-1 overflow-hidden">
            {["All Properties", ...(properties.data ?? []).map((p) => p.name)].map((name) => (
              <Pressable
                key={name}
                onPress={() => {
                  setScope(name);
                  setOpen(false);
                }}
                className="px-4 py-3 active:bg-[#F8FAFC]"
              >
                <Text className="text-[14px] text-[#0F2C4A]">{name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text className="text-[18px] font-semibold text-[#0F2C4A] mt-5 mb-3">
          Good morning, {user?.name}
        </Text>

        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView message={error} onRetry={() => { properties.refetch(); units.refetch(); rentCharges.refetch(); }} />
        ) : (
          <>
            <View className="flex-row gap-3 mb-3">
              <Stat value={String((properties.data ?? []).length)} label="Properties" />
              <Stat value={String((units.data ?? []).length)} label="Units" />
            </View>
            <View className="flex-row gap-3">
              <Stat value={`${occupancy}%`} label="Occupancy Rate" />
              <Stat value={moneyShort(collected)} label="Rent Collected" />
            </View>

            <Card className="mt-5">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-[15px] font-semibold text-[#0F2C4A]">Financial Overview</Text>
                <Text className="text-[12px] text-[#6B7280]">All Time</Text>
              </View>
              <View className="flex-row">
                <View className="flex-1">
                  <Text className="text-[12px] text-[#6B7280] mb-1">Collected</Text>
                  <Text className="text-[22px] font-bold text-[#16A34A]">{money(collected)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[12px] text-[#6B7280] mb-1">Outstanding</Text>
                  <Text className="text-[22px] font-bold text-[#DC2626]">{money(outstanding)}</Text>
                </View>
              </View>
            </Card>

            <Card className="mt-3">
              <Text className="text-[13px] text-[#6B7280] mb-2">Collection Rate</Text>
              <Text className="text-[26px] font-bold text-[#0F2C4A] mb-3">{collectionRate}%</Text>
              <Bar pct={collectionRate} color={C.green} />
            </Card>

            <Card className="mt-3">
              <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-4">Arrears Aging</Text>
              <View className="flex-row gap-3">
                {arrears.map((a) => (
                  <View key={a.label} className="flex-1">
                    <Text className="text-[11px] text-[#6B7280] mb-1">{a.label}</Text>
                    <Text className="text-[18px] font-bold" style={{ color: a.color }}>
                      {moneyShort(a.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}
      </Screen>
    </View>
  );
}
