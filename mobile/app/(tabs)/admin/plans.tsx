import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
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
  SectionTitle,
} from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { centsToDollars, money } from "@/lib/data";
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptionPlans,
  updateSubscriptionPlan,
  type SubscriptionPlanInput,
} from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { SubscriptionPlan } from "@/lib/types";

const INTERVALS = ["monthly", "yearly"] as const;

function formatMoney(minor: string, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(minor) / 100);
}

function PlanForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: SubscriptionPlan;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(
    initial ? centsToDollars(initial.amountMinor).toString() : "",
  );
  const [perUnit, setPerUnit] = useState(
    initial?.pricePerUnitMinor
      ? centsToDollars(initial.pricePerUnitMinor).toString()
      : "",
  );
  const [minUnits, setMinUnits] = useState(
    initial?.minimumUnits?.toString() ?? "",
  );
  const [maxUnits, setMaxUnits] = useState(
    initial?.maximumUnits?.toString() ?? "",
  );
  const [trialDays, setTrialDays] = useState(
    initial?.trialDays?.toString() ?? "",
  );
  const [interval, setInterval] = useState<"monthly" | "yearly">(
    (initial?.billingInterval as "monthly" | "yearly") ?? "monthly",
  );
  const [customPricing, setCustomPricing] = useState(
    initial?.customPricing ?? false,
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!code.trim() || !name.trim() || amount === "") {
      setError("Code, name and amount are required.");
      return;
    }
    const dto: SubscriptionPlanInput = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      amountMinor: String(Math.round(Number(amount) * 100)),
      pricePerUnitMinor:
        perUnit === "" ? undefined : String(Math.round(Number(perUnit) * 100)),
      minimumUnits: minUnits === "" ? undefined : Number(minUnits),
      maximumUnits: maxUnits === "" ? undefined : Number(maxUnits),
      trialDays: trialDays === "" ? undefined : Number(trialDays),
      billingInterval: interval,
      customPricing,
      isActive,
    };
    setBusy(true);
    try {
      if (initial) {
        await updateSubscriptionPlan(initial.id, dto);
      } else {
        await createSubscriptionPlan(dto);
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
        {initial ? "Edit plan" : "New plan"}
      </Text>
      <Field
        label="Code"
        placeholder="e.g. PRO"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
      />
      <Field
        label="Name"
        placeholder="e.g. Professional"
        value={name}
        onChangeText={setName}
      />
      <Field
        label="Description"
        placeholder="Short description"
        value={description}
        onChangeText={setDescription}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field
            label="Amount (USD)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        <View className="flex-1">
          <Field
            label="Per unit (USD)"
            placeholder="optional"
            keyboardType="decimal-pad"
            value={perUnit}
            onChangeText={setPerUnit}
          />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field
            label="Min units"
            placeholder="optional"
            keyboardType="number-pad"
            value={minUnits}
            onChangeText={setMinUnits}
          />
        </View>
        <View className="flex-1">
          <Field
            label="Max units"
            placeholder="optional"
            keyboardType="number-pad"
            value={maxUnits}
            onChangeText={setMaxUnits}
          />
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field
            label="Trial days"
            placeholder="optional"
            keyboardType="number-pad"
            value={trialDays}
            onChangeText={setTrialDays}
          />
        </View>
        <View className="flex-1">
          <Text className="text-[13px] text-[#6B7280] mb-1.5">Interval</Text>
          <Pills
            options={INTERVALS}
            value={interval}
            onChange={(v) => setInterval(v as "monthly" | "yearly")}
          />
        </View>
      </View>
      <Pressable
        onPress={() => setCustomPricing((v) => !v)}
        className="flex-row items-center gap-2 py-2 mb-3"
      >
        <View
          className={`h-5 w-5 rounded border items-center justify-center ${
            customPricing ? "bg-[#0F2C4A] border-[#0F2C4A]" : "border-[#CBD5E1]"
          }`}
        >
          {customPricing ? (
            <Text className="text-white text-[12px]">✓</Text>
          ) : null}
        </View>
        <Text className="text-[13px] text-[#0F2C4A]">
          Custom pricing (negotiated per-unit)
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setIsActive((v) => !v)}
        className="flex-row items-center gap-2 py-2 mb-3"
      >
        <View
          className={`h-5 w-5 rounded border items-center justify-center ${
            isActive ? "bg-[#0F2C4A] border-[#0F2C4A]" : "border-[#CBD5E1]"
          }`}
        >
          {isActive ? <Text className="text-white text-[12px]">✓</Text> : null}
        </View>
        <Text className="text-[13px] text-[#0F2C4A]">
          Active (visible to users)
        </Text>
      </Pressable>
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
          label={initial ? "Save changes" : "Create plan"}
          className="flex-1"
          onPress={submit}
          disabled={busy}
        />
      </View>
    </Card>
  );
}

export default function AdminPlans() {
  const plans = useFetch(getSubscriptionPlans, []);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = plans.data ?? [];

  async function remove(plan: SubscriptionPlan) {
    Alert.alert(
      "Delete plan",
      `Delete "${plan.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyId(plan.id);
            setError(null);
            try {
              await deleteSubscriptionPlan(plan.id);
              await plans.refetch();
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

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Subscription plans" />
      <Screen>
        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
        ) : null}

        {creating ? (
          <PlanForm
            onCancel={() => setCreating(false)}
            onDone={() => {
              setCreating(false);
              plans.refetch();
            }}
          />
        ) : null}

        {editing ? (
          <PlanForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onDone={() => {
              setEditing(null);
              plans.refetch();
            }}
          />
        ) : null}

        <SectionTitle
          right={
            !creating && !editing ? (
              <Btn
                label="Add plan"
                icon="add"
                variant="dark"
                className="px-3 py-1.5"
                onPress={() => setCreating(true)}
              />
            ) : undefined
          }
        >
          Plans
        </SectionTitle>

        {plans.loading ? (
          <LoadingView />
        ) : plans.error ? (
          <ErrorView message={plans.error} onRetry={plans.refetch} />
        ) : list.length === 0 ? (
          <Card>
            <Text className="text-[13px] text-[#6B7280]">
              No plans yet. Add your first plan.
            </Text>
          </Card>
        ) : (
          list.map((plan) => (
            <Card key={plan.id} className="mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                      {plan.name}
                    </Text>
                    <Badge
                      text={plan.code}
                      tone={plan.isActive ? "green" : "muted"}
                    />
                  </View>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    {plan.billingInterval} · {plan.currency}
                  </Text>
                </View>
                <Text className="text-[16px] font-bold text-[#0F2C4A]">
                  {formatMoney(plan.amountMinor, plan.currency)}
                </Text>
              </View>
              {plan.description ? (
                <Text className="text-[12px] text-[#6B7280] mt-1">
                  {plan.description}
                </Text>
              ) : null}
              <View className="flex-row flex-wrap gap-x-4 gap-y-1 mt-2">
                {plan.pricePerUnitMinor ? (
                  <Text className="text-[11px] text-[#6B7280]">
                    {formatMoney(plan.pricePerUnitMinor, plan.currency)}/unit
                  </Text>
                ) : null}
                {plan.minimumUnits != null ? (
                  <Text className="text-[11px] text-[#6B7280]">
                    Min {plan.minimumUnits} units
                  </Text>
                ) : null}
                {plan.maximumUnits != null ? (
                  <Text className="text-[11px] text-[#6B7280]">
                    Max {plan.maximumUnits} units
                  </Text>
                ) : null}
                {plan.trialDays != null ? (
                  <Text className="text-[11px] text-[#6B7280]">
                    {plan.trialDays}-day trial
                  </Text>
                ) : null}
                {plan.customPricing ? (
                  <Text className="text-[11px] text-[#6B7280]">
                    Custom pricing
                  </Text>
                ) : null}
              </View>
              <View className="flex-row gap-2 mt-3 border-t border-[#F1F5F9] pt-3">
                <Btn
                  label="Edit"
                  variant="outline"
                  className="flex-1"
                  disabled={busyId === plan.id}
                  onPress={() => setEditing(plan)}
                />
                <Btn
                  label="Delete"
                  variant="outline"
                  className="flex-1"
                  disabled={busyId === plan.id}
                  onPress={() => remove(plan)}
                />
              </View>
            </Card>
          ))
        )}
      </Screen>
    </View>
  );
}
