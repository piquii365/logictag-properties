import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Card, ErrorView, Header, LoadingView, Screen } from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import { getLeases, getPayments, getRentCharges, getUnit } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

const RANGES = ["All Transactions", "Last 3 months", "This year"];
const OUTSTANDING_STATUSES = new Set(["outstanding", "part_paid"]);

type Line = { date: string; label: string; amount: number };

export default function Statement() {
  const { unitId } = useLocalSearchParams<{ unitId?: string }>();
  const [range, setRange] = useState(RANGES[0]);
  const [open, setOpen] = useState(false);

  const unit = useFetch(() => (unitId ? getUnit(unitId) : Promise.resolve(null)), [unitId]);
  const leases = useFetch(getLeases);
  const rentCharges = useFetch(getRentCharges);
  const payments = useFetch(getPayments);

  const currentLease = useMemo(
    () =>
      (leases.data ?? [])
        .filter((l) => l.unitId === unitId)
        .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0] ?? null,
    [leases.data, unitId],
  );

  const { lines, balance } = useMemo(() => {
    if (!currentLease) return { lines: [] as Line[], balance: 0 };
    const charges: Line[] = (rentCharges.data ?? [])
      .filter((c) => c.leaseId === currentLease.id)
      .map((c) => ({
        date: c.dueDate,
        label: `Rent Charge — ${c.periodStart} to ${c.periodEnd}`,
        amount: centsToDollars(c.amountMinor),
      }));
    const pays: Line[] = (payments.data ?? [])
      .filter((p) => p.leaseId === currentLease.id && p.status === "succeeded")
      .map((p) => ({
        date: (p.paidAt ?? p.createdAt).slice(0, 10),
        label: `Payment — ${p.method.replace("_", " ")}`,
        amount: -centsToDollars(p.amountMinor),
      }));
    const combined = [...charges, ...pays].sort((a, b) => (a.date < b.date ? 1 : -1));
    const outstandingMinor = (rentCharges.data ?? [])
      .filter((c) => c.leaseId === currentLease.id && OUTSTANDING_STATUSES.has(c.status))
      .reduce((s, c) => s + (Number(c.amountMinor) - Number(c.allocatedMinor)), 0);
    return { lines: combined, balance: centsToDollars(outstandingMinor) };
  }, [currentLease, rentCharges.data, payments.data]);

  const u = unit.data;
  const loading = unit.loading || leases.loading;

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Statement" right="notifications-outline" badge />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : !currentLease ? (
          <ErrorView message="No lease found for this unit yet — nothing to show a statement for." />
        ) : (
          <>
            <Card>
              <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                {u?.tenant?.name ?? "Tenant"} - {u?.label}
              </Text>
              <Text className="text-[12px] text-[#6B7280] mt-0.5 mb-4">{u?.property?.name ?? ""}</Text>
              <Text className="text-[12px] text-[#6B7280]">Current Balance</Text>
              <Text
                className="text-[28px] font-bold"
                style={{ color: balance ? "#DC2626" : "#16A34A" }}
              >
                {money(balance)}
              </Text>
              {balance ? <Text className="text-[12px] text-[#DC2626]">Overdue</Text> : null}
            </Card>

            <Pressable
              onPress={() => setOpen((v) => !v)}
              className="flex-row items-center justify-between bg-white border border-[#E5E9F0] rounded-xl px-4 py-3.5 mt-4"
            >
              <Text className="text-[14px] text-[#0F2C4A]">{range}</Text>
              <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#6B7280" />
            </Pressable>
            {open ? (
              <View className="bg-white border border-[#E5E9F0] rounded-xl mt-1 overflow-hidden">
                {RANGES.map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setRange(r);
                      setOpen(false);
                    }}
                    className="px-4 py-3 active:bg-[#F8FAFC]"
                  >
                    <Text className="text-[14px] text-[#0F2C4A]">{r}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View className="mt-4 bg-white rounded-2xl border border-[#E5E9F0] overflow-hidden">
              {lines.map((t, i) => (
                <View
                  key={`${t.date}-${t.label}-${i}`}
                  className={`px-4 py-3.5 ${i ? "border-t border-[#E5E9F0]" : ""}`}
                >
                  <Text className="text-[11px] text-[#6B7280]">{t.date}</Text>
                  <View className="flex-row items-center justify-between mt-0.5">
                    <Text className="text-[14px] text-[#0F2C4A] flex-1 pr-3">{t.label}</Text>
                    <Text
                      className="text-[14px] font-semibold"
                      style={{ color: t.amount < 0 ? "#16A34A" : "#0F2C4A" }}
                    >
                      {t.amount < 0 ? "-" : ""}
                      {money(t.amount)}
                    </Text>
                  </View>
                </View>
              ))}
              {lines.length === 0 ? (
                <Text className="text-center text-[13px] text-[#6B7280] py-8">No transactions yet.</Text>
              ) : (
                <View className="flex-row items-center justify-between px-4 py-4 bg-[#F8FAFC] border-t border-[#E5E9F0]">
                  <Text className="text-[14px] font-semibold text-[#0F2C4A]">Outstanding Balance</Text>
                  <Text className="text-[16px] font-bold text-[#DC2626]">{money(balance)}</Text>
                </View>
              )}
            </View>
          </>
        )}
      </Screen>
    </View>
  );
}
