import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Bar,
  Divider,
  ErrorView,
  Group,
  Header,
  LoadingView,
  Metric,
  Row,
  Screen,
  SectionTitle,
  StatusText,
} from "@/components/ui";
import { C, centsToDollars, money } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import {
  getMaintenanceRequests,
  getMyUnits,
  getPayments,
  getProperties,
  getRentCharges,
} from "@/lib/queries";
import { isTenant, isVendor } from "@/lib/roles";
import { useFetch } from "@/lib/useFetch";
import type { Payment, Unit } from "@/lib/types";

const OUTSTANDING_STATUSES = new Set(["outstanding", "part_paid"]);
const DAY_MS = 24 * 60 * 60 * 1000;

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.role;

  if (isTenant(role)) return <TenantDashboard />;
  if (isVendor(role)) return <VendorDashboard />;
  return <ManagementDashboard />;
}

// ── Management portfolio dashboard (landlord / PM / staff / admin) ──
function ManagementDashboard() {
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
    return Math.round(
      (list.filter((u) => u.status === "occupied").length / list.length) * 100,
    );
  }, [units.data]);

  const { collected, outstanding, arrears } = useMemo(() => {
    const charges = rentCharges.data ?? [];
    const collectedMinor = charges.reduce(
      (s, c) => s + Number(c.allocatedMinor),
      0,
    );
    const now = Date.now();
    const buckets = { "0-30 Days": 0, "31-60 Days": 0, "60+ Days": 0 };
    let outstandingMinor = 0;
    for (const c of charges) {
      if (!OUTSTANDING_STATUSES.has(c.status)) continue;
      const owed = Number(c.amountMinor) - Number(c.allocatedMinor);
      if (owed <= 0) continue;
      outstandingMinor += owed;
      const daysOverdue = Math.floor(
        (now - new Date(c.dueDate).getTime()) / DAY_MS,
      );
      if (daysOverdue <= 30) buckets["0-30 Days"] += owed;
      else if (daysOverdue <= 60) buckets["31-60 Days"] += owed;
      else buckets["60+ Days"] += owed;
    }
    return {
      collected: centsToDollars(collectedMinor),
      outstanding: centsToDollars(outstandingMinor),
      arrears: [
        {
          label: "0-30 Days",
          amount: centsToDollars(buckets["0-30 Days"]),
          color: C.amber,
        },
        {
          label: "31-60 Days",
          amount: centsToDollars(buckets["31-60 Days"]),
          color: "#EA580C",
        },
        {
          label: "60+ Days",
          amount: centsToDollars(buckets["60+ Days"]),
          color: C.red,
        },
      ],
    };
  }, [rentCharges.data]);

  const collectionRate =
    collected + outstanding > 0
      ? Math.round((collected / (collected + outstanding)) * 100)
      : 0;

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
          className="flex-row items-center justify-between bg-white border border-[#E5E9F0] rounded-lg px-4 py-3"
        >
          <Text className="text-[14px] font-medium text-[#0F2C4A]">
            {scope}
          </Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={18}
            color="#6B7280"
          />
        </Pressable>
        {open ? (
          <View className="bg-white border border-[#E5E9F0] rounded-lg mt-1 overflow-hidden">
            {[
              "All Properties",
              ...(properties.data ?? []).map((p) => p.name),
            ].map((name) => (
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

        <Text className="text-[15px] text-[#6B7280] mt-6 mb-1">
          Good morning, {user?.name}
        </Text>

        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              properties.refetch();
              units.refetch();
              rentCharges.refetch();
            }}
          />
        ) : (
          <>
            {/* Dominant figure: rent collected. Everything else is secondary. */}
            <View className="mt-2">
              <Metric
                value={money(collected)}
                label="Rent collected"
                tone="#0F2C4A"
              />
              <View className="flex-row items-center mt-2">
                <Text className="text-[13px] font-semibold text-[#16A34A]">
                  {collectionRate}%
                </Text>
                <Text className="text-[13px] text-[#6B7280] ml-1.5">
                  collection rate
                </Text>
              </View>
            </View>

            {/* Secondary portfolio metrics, flat with dividers — no boxes. */}
            <View className="flex-row mt-6 border-t border-b border-[#E5E9F0] py-4">
              <View className="flex-1">
                <Text className="text-[20px] font-bold text-[#0F2C4A]">
                  {(properties.data ?? []).length}
                </Text>
                <Text className="text-[12px] text-[#6B7280] mt-0.5">
                  Properties
                </Text>
              </View>
              <View className="w-px bg-[#E5E9F0]" />
              <View className="flex-1 px-4">
                <Text className="text-[20px] font-bold text-[#0F2C4A]">
                  {(units.data ?? []).length}
                </Text>
                <Text className="text-[12px] text-[#6B7280] mt-0.5">Units</Text>
              </View>
              <View className="w-px bg-[#E5E9F0]" />
              <View className="flex-1 pl-4">
                <Text className="text-[20px] font-bold text-[#0F2C4A]">
                  {occupancy}%
                </Text>
                <Text className="text-[12px] text-[#6B7280] mt-0.5">
                  Occupancy
                </Text>
              </View>
            </View>

            <SectionTitle>Financial overview</SectionTitle>
            <View className="flex-row">
              <View className="flex-1">
                <Text className="text-[12px] text-[#6B7280] mb-1">
                  Collected
                </Text>
                <Text className="text-[20px] font-bold text-[#16A34A]">
                  {money(collected)}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[12px] text-[#6B7280] mb-1">
                  Outstanding
                </Text>
                <Text className="text-[20px] font-bold text-[#DC2626]">
                  {money(outstanding)}
                </Text>
              </View>
            </View>
            <View className="mt-4">
              <Bar pct={collectionRate} color={C.green} />
            </View>

            <SectionTitle>Arrears aging</SectionTitle>
            <Group>
              {arrears.map((a, i) => (
                <View
                  key={a.label}
                  className={`flex-row items-center justify-between px-4 py-3.5 ${
                    i ? "border-t border-[#E5E9F0]" : ""
                  }`}
                >
                  <Text className="text-[14px] text-[#0F2C4A]">{a.label}</Text>
                  <Text
                    className="text-[15px] font-semibold"
                    style={{ color: a.color }}
                  >
                    {money(a.amount)}
                  </Text>
                </View>
              ))}
            </Group>
          </>
        )}
      </Screen>
    </View>
  );
}

// ── Tenant home: my unit + rent + payments ────────────────────────
function TenantDashboard() {
  const { user } = useAuth();
  const units = useFetch(getMyUnits);
  const rentCharges = useFetch(getRentCharges);
  const payments = useFetch(getPayments);

  const loading = units.loading || rentCharges.loading || payments.loading;
  const error = units.error ?? rentCharges.error ?? payments.error;

  const myUnit: Unit | null = units.data?.[0] ?? null;

  const outstandingMinor = useMemo(() => {
    let total = 0;
    for (const c of rentCharges.data ?? []) {
      if (!OUTSTANDING_STATUSES.has(c.status)) continue;
      const owed = Number(c.amountMinor) - Number(c.allocatedMinor);
      if (owed > 0) total += owed;
    }
    return total;
  }, [rentCharges.data]);

  const recent: Payment[] = useMemo(
    () =>
      [...(payments.data ?? [])]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, 5),
    [payments.data],
  );

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header
        title="Home"
        back={false}
        right="notifications-outline"
        badge
        onRight={() => router.push("/(tabs)/notifications")}
      />
      <Screen>
        <Text className="text-[15px] text-[#6B7280] mb-1">
          Hi {user?.name?.split(" ")[0] ?? "there"}
        </Text>

        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              units.refetch();
              rentCharges.refetch();
              payments.refetch();
            }}
          />
        ) : (
          <>
            {myUnit ? (
              <View className="mt-2">
                <Text className="text-[12px] text-[#6B7280] mb-1">My unit</Text>
                <Text className="text-[26px] font-bold text-[#0F2C4A]">
                  {myUnit.label}
                </Text>
                <Text className="text-[14px] text-[#6B7280] mt-0.5">
                  {myUnit.property?.name ?? "Property"}
                </Text>
                <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-[#E5E9F0]">
                  <Text className="text-[13px] text-[#6B7280]">
                    Outstanding rent
                  </Text>
                  <Text
                    className={`text-[20px] font-bold ${
                      outstandingMinor > 0 ? "text-[#DC2626]" : "text-[#16A34A]"
                    }`}
                  >
                    {money(centsToDollars(outstandingMinor))}
                  </Text>
                </View>
              </View>
            ) : (
              <Text className="text-[14px] text-[#6B7280] mt-2">
                No unit assigned to your account yet.
              </Text>
            )}

            <SectionTitle>Actions</SectionTitle>
            <Group>
              <Row
                icon="card-outline"
                iconTint="#F96B1F"
                title="Pay Rent"
                sub="Make a rent payment"
                onPress={() => router.push("/(tabs)/payments/pay-rent")}
              />
              <Divider />
              <Row
                icon="construct-outline"
                iconTint="#F96B1F"
                title="Report Maintenance"
                sub="Request a repair in your unit"
                onPress={() => router.push("/(tabs)/maintenance/new")}
              />
            </Group>

            <SectionTitle>Recent payments</SectionTitle>
            <Group>
              {recent.length === 0 ? (
                <Text className="text-center text-[13px] text-[#6B7280] py-6">
                  No payments yet.
                </Text>
              ) : (
                recent.map((p, i) => (
                  <View
                    key={p.id}
                    className={`px-4 py-3.5 ${i ? "border-t border-[#E5E9F0]" : ""}`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[14px] text-[#0F2C4A] flex-1 pr-3">
                        {new Date(p.createdAt).toLocaleDateString()} ·{" "}
                        {p.method.replace("_", " ")}
                      </Text>
                      <Text className="text-[14px] font-semibold text-[#16A34A]">
                        {money(centsToDollars(p.amountMinor))}
                      </Text>
                    </View>
                    <View className="mt-1">
                      <StatusText
                        text={p.status}
                        tone={p.status === "succeeded" ? "green" : "amber"}
                      />
                    </View>
                  </View>
                ))
              )}
            </Group>
          </>
        )}
      </Screen>
    </View>
  );
}

// ── Vendor home: their maintenance jobs ───────────────────────────
function VendorDashboard() {
  const { user } = useAuth();
  const jobs = useFetch(getMaintenanceRequests);

  const openJobs = useMemo(
    () =>
      (jobs.data ?? []).filter((r) =>
        ["open", "assigned", "quoted", "approved", "in_progress"].includes(r.status),
      ),
    [jobs.data],
  );

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header
        title="Home"
        back={false}
        right="notifications-outline"
        badge
        onRight={() => router.push("/(tabs)/notifications")}
      />
      <Screen>
        <Text className="text-[15px] text-[#6B7280] mb-1">
          Hi {user?.name?.split(" ")[0] ?? "there"}
        </Text>

        {jobs.loading ? (
          <LoadingView />
        ) : jobs.error ? (
          <ErrorView message={jobs.error} onRetry={jobs.refetch} />
        ) : (
          <>
            <View className="flex-row mt-2 border-t border-b border-[#E5E9F0] py-4">
              <View className="flex-1">
                <Text className="text-[20px] font-bold text-[#0F2C4A]">
                  {openJobs.length}
                </Text>
                <Text className="text-[12px] text-[#6B7280] mt-0.5">
                  Active jobs
                </Text>
              </View>
              <View className="w-px bg-[#E5E9F0]" />
              <View className="flex-1 pl-4">
                <Text className="text-[20px] font-bold text-[#0F2C4A]">
                  {(jobs.data ?? []).length}
                </Text>
                <Text className="text-[12px] text-[#6B7280] mt-0.5">
                  Total jobs
                </Text>
              </View>
            </View>

            <SectionTitle>Active jobs</SectionTitle>
            <Group>
              {openJobs.length === 0 ? (
                <Text className="text-center text-[13px] text-[#6B7280] py-6">
                  No active jobs.
                </Text>
              ) : (
                openJobs.map((r, i) => (
                  <Pressable
                    key={r.id}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/maintenance/[id]",
                        params: { id: r.id },
                      })
                    }
                    className={`px-4 py-3.5 ${i ? "border-t border-[#E5E9F0]" : ""}`}
                  >
                    <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                      {r.title}
                    </Text>
                    <Text className="text-[12px] text-[#6B7280] mt-0.5">
                      {r.unit?.label ?? "—"} · {r.unit?.property?.name ?? "—"}
                    </Text>
                    <View className="mt-1.5">
                      <StatusText
                        text={r.status.replace("_", " ")}
                        tone="amber"
                      />
                    </View>
                  </Pressable>
                ))
              )}
            </Group>
          </>
        )}
      </Screen>
    </View>
  );
}
