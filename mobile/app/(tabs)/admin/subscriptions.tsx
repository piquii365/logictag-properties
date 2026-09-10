import { useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  Badge,
  Btn,
  Card,
  ErrorView,
  Field,
  Header,
  LoadingView,
  Pills,
  Screen,
  SearchBar,
  SectionTitle,
} from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { centsToDollars } from "@/lib/data";
import {
  adminCreateSubscription,
  adminDeleteSubscription,
  adminUpdateSubscription,
  getSubscriptionPlans,
  getSubscriptions,
  getUsers,
  type AdminSubscriptionInput,
} from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { AdminUser, Subscription, SubscriptionPlan } from "@/lib/types";

const STATUS_OPTIONS = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
] as const;

function statusTone(status: string): "green" | "amber" | "red" | "muted" {
  if (status === "active") return "green";
  if (status === "trialing") return "amber";
  if (status === "canceled" || status === "expired") return "red";
  return "muted";
}

function formatMoney(minor: string, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(minor) / 100);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function SubscriptionForm({
  plans,
  users,
  initial,
  onDone,
  onCancel,
}: {
  plans: SubscriptionPlan[];
  users: AdminUser[];
  initial?: Subscription;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [userId, setUserId] = useState(initial?.user?.id ?? "");
  const [planId, setPlanId] = useState(initial?.planId ?? plans[0]?.id ?? "");
  const [status, setStatus] = useState<Subscription["status"]>(
    initial?.status ?? "active",
  );
  const [managedUnits, setManagedUnits] = useState(
    initial?.managedUnits?.toString() ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!userId || !planId) {
      setError("Select a user and a plan.");
      return;
    }
    const dto: AdminSubscriptionInput = {
      userId,
      planId,
      status,
      managedUnits: managedUnits === "" ? undefined : Number(managedUnits),
    };
    setBusy(true);
    try {
      if (initial) {
        await adminUpdateSubscription(initial.id, dto);
      } else {
        await adminCreateSubscription(dto);
      }
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4">
      <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-3">
        {initial ? "Edit subscription" : "New subscription"}
      </Text>

      <Text className="text-[13px] text-[#6B7280] mb-1.5">User</Text>
      <View className="flex-row flex-wrap gap-1.5 mb-4">
        {users.map((u) => (
          <Btn
            key={u.id}
            label={u.name}
            variant={userId === u.id ? "dark" : "outline"}
            className="px-2.5 py-1.5"
            onPress={() => setUserId(u.id)}
          />
        ))}
      </View>

      <Text className="text-[13px] text-[#6B7280] mb-1.5">Plan</Text>
      <View className="flex-row flex-wrap gap-1.5 mb-4">
        {plans.map((p) => (
          <Btn
            key={p.id}
            label={`${p.name} (${p.billingInterval})`}
            variant={planId === p.id ? "dark" : "outline"}
            className="px-2.5 py-1.5"
            onPress={() => setPlanId(p.id)}
          />
        ))}
      </View>

      <Text className="text-[13px] text-[#6B7280] mb-1.5">Status</Text>
      <View className="mb-4">
        <Pills
          options={STATUS_OPTIONS}
          value={status}
          onChange={(v) => setStatus(v as Subscription["status"])}
        />
      </View>

      <Field
        label="Managed units"
        placeholder="0"
        keyboardType="number-pad"
        value={managedUnits}
        onChangeText={setManagedUnits}
      />

      {error ? (
        <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
      ) : null}
      <View className="flex-row gap-2">
        <Btn
          label="Cancel"
          variant="outline"
          className="flex-1"
          onPress={onCancel}
          disabled={busy}
        />
        <Btn
          label={initial ? "Save changes" : "Create subscription"}
          className="flex-1"
          onPress={submit}
          disabled={busy}
        />
      </View>
    </Card>
  );
}

export default function AdminSubscriptions() {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subs = useFetch(
    () =>
      getSubscriptions().then((all) =>
        search.trim()
          ? all.filter((s) => {
              const q = search.trim().toLowerCase();
              const name = s.user?.name?.toLowerCase() ?? "";
              const email = s.user?.email?.toLowerCase() ?? "";
              const plan = s.plan?.name?.toLowerCase() ?? "";
              return name.includes(q) || email.includes(q) || plan.includes(q);
            })
          : all,
      ),
    [search],
  );
  const plans = useFetch(getSubscriptionPlans, []);
  const users = useFetch(
    () => getUsers({ limit: 200 }).then((r) => r.items),
    [],
  );

  const list = subs.data ?? [];

  async function remove(sub: Subscription) {
    Alert.alert(
      "Delete subscription",
      `Delete ${sub.user?.name ?? "this user"}'s subscription? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyId(sub.id);
            setError(null);
            try {
              await adminDeleteSubscription(sub.id);
              await subs.refetch();
            } catch (err) {
              setError(apiErrorMessage(err));
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  }

  const showForm = creating || editing;

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Subscriptions" />
      <Screen>
        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
        ) : null}

        {showForm ? (
          <SubscriptionForm
            plans={plans.data ?? []}
            users={users.data ?? []}
            initial={editing ?? undefined}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
            onDone={() => {
              setCreating(false);
              setEditing(null);
              subs.refetch();
            }}
          />
        ) : null}

        <SearchBar
          placeholder="Search user or plan"
          value={search}
          onChangeText={setSearch}
        />

        <SectionTitle
          right={
            !showForm ? (
              <Btn
                label="Add"
                icon="add"
                variant="dark"
                className="px-3 py-1.5"
                onPress={() => setCreating(true)}
              />
            ) : undefined
          }
        >
          All subscriptions
        </SectionTitle>

        {subs.loading ? (
          <LoadingView />
        ) : subs.error ? (
          <ErrorView message={subs.error} onRetry={subs.refetch} />
        ) : list.length === 0 ? (
          <Card>
            <Text className="text-[13px] text-[#6B7280]">
              No subscriptions found.
            </Text>
          </Card>
        ) : (
          list.map((sub) => (
            <Card key={sub.id} className="mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                    {sub.user?.name ?? "Unknown user"}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    {sub.user?.email ?? ""}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-2">
                    <Badge text={sub.plan?.name ?? "No plan"} tone="navy" />
                    <Badge text={sub.status} tone={statusTone(sub.status)} />
                  </View>
                </View>
                <Text className="text-[15px] font-bold text-[#0F2C4A]">
                  {sub.plan
                    ? formatMoney(sub.plan.amountMinor, sub.plan.currency)
                    : "—"}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-2">
                <Text className="text-[11px] text-[#6B7280]">
                  {sub.managedUnits} units
                </Text>
                <Text className="text-[11px] text-[#6B7280]">
                  Started {formatDate(sub.startedAt)}
                </Text>
                {sub.currentPeriodEnd ? (
                  <Text className="text-[11px] text-[#6B7280]">
                    Renews {formatDate(sub.currentPeriodEnd)}
                  </Text>
                ) : null}
              </View>
              <View className="flex-row gap-2 mt-3 border-t border-[#F1F5F9] pt-3">
                <Btn
                  label="Edit"
                  variant="outline"
                  className="flex-1"
                  disabled={busyId === sub.id}
                  onPress={() => setEditing(sub)}
                />
                <Btn
                  label="Delete"
                  variant="outline"
                  className="flex-1"
                  disabled={busyId === sub.id}
                  onPress={() => remove(sub)}
                />
              </View>
            </Card>
          ))
        )}
      </Screen>
    </View>
  );
}
