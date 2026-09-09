import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import {
  Btn,
  Card,
  ErrorView,
  Header,
  LoadingView,
  Screen,
} from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  getSubscriptionPayments,
  getSubscriptionPlans,
  getSubscriptions,
  resumeSubscription,
  subscribeToPlan,
} from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type {
  Subscription,
  SubscriptionPayment,
  SubscriptionPlan,
} from "@/lib/types";

type BillingInterval = "monthly" | "yearly";

function formatMoney(minor: string | number, currency = "USD") {
  const value = typeof minor === "string" ? Number(minor) : minor;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value / 100);
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The amount a subscription actually bills: per-unit pricing wins when the
 * plan is priced per unit and the owner has units, otherwise the flat plan
 * amount (or the negotiated per-unit price × units for custom plans). */
function billedAmountMinor(sub: Subscription): string {
  const plan = sub.plan;
  const perUnit = sub.agreedPricePerUnitMinor ?? plan.pricePerUnitMinor;
  if (perUnit && sub.managedUnits > 0) {
    return (BigInt(perUnit) * BigInt(sub.managedUnits)).toString();
  }
  return plan.amountMinor;
}

/** When the next charge lands. The server stores period boundaries but not an
 * explicit "next billing date", so fall back to the trial end or a computed
 * date one interval after the period start. */
function nextBillingDate(sub: Subscription): string | null {
  if (sub.status === "trialing") return sub.trialEndsAt;
  if (sub.currentPeriodEnd) return sub.currentPeriodEnd;
  if (sub.currentPeriodStart) {
    const start = new Date(sub.currentPeriodStart);
    const months = sub.plan.billingInterval === "yearly" ? 12 : 1;
    start.setMonth(start.getMonth() + months);
    return start.toISOString();
  }
  return null;
}

function StatusBadge({ status }: { status: Subscription["status"] }) {
  const labels: Record<Subscription["status"], string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past due",
    canceled: "Cancelled",
    expired: "Expired",
  };
  const styles: Record<Subscription["status"], string> = {
    active: "bg-[#E8F7F2] text-[#087F5B]",
    trialing: "bg-[#EEF2FF] text-[#4C51BF]",
    past_due: "bg-[#FFF7E6] text-[#B7791F]",
    canceled: "bg-[#FDECEC] text-[#C53030]",
    expired: "bg-[#F1F5F9] text-[#64748B]",
  };

  return (
    <View className={`rounded-full px-3 py-1 ${styles[status]}`}>
      <Text className="text-[11px] font-semibold">{labels[status]}</Text>
    </View>
  );
}

function PaymentStatus({ status }: { status: SubscriptionPayment["status"] }) {
  const styles = {
    succeeded: "bg-[#E8F7F2] text-[#087F5B]",
    pending: "bg-[#FFF7E6] text-[#B7791F]",
    failed: "bg-[#FDECEC] text-[#C53030]",
  } as const;

  const [background, foreground] = styles[status].split(" ");

  return (
    <View className={`rounded-full px-2.5 py-1 ${background}`}>
      <Text className={`text-[10px] font-semibold ${foreground}`}>
        {status}
      </Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        last ? "" : "border-b border-[#EEF1F4]"
      }`}
    >
      <Text className="text-[12px] text-[#6B7280]">{label}</Text>
      <Text className="max-w-[60%] text-right text-[12px] font-medium text-[#172B4D]">
        {value}
      </Text>
    </View>
  );
}

/** The most recent subscription that isn't fully expired/cancelled, else the
 * newest row. The screen is built around a single "current" subscription. */
function pickCurrent(subscriptions: Subscription[]): Subscription | null {
  if (subscriptions.length === 0) return null;
  const active = subscriptions.find(
    (s) => s.status === "active" || s.status === "trialing",
  );
  return active ?? subscriptions[0];
}

export default function SubscriptionManagement() {
  const [activeTab, setActiveTab] = useState<"overview" | "plans" | "payments">(
    "overview",
  );
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: subscriptions,
    loading: loadingSubs,
    error: subsError,
    refetch: refetchSubs,
  } = useFetch(getSubscriptions, []);
  const {
    data: plans,
    loading: loadingPlans,
    error: plansError,
  } = useFetch(getSubscriptionPlans, []);

  const subscription = useMemo(
    () => pickCurrent(subscriptions ?? []),
    [subscriptions],
  );

  const {
    data: payments,
    loading: loadingPayments,
    error: paymentsError,
    refetch: refetchPayments,
  } = useFetch(
    () =>
      subscription
        ? getSubscriptionPayments(subscription.id)
        : Promise.resolve([]),
    [subscription?.id],
  );

  const loading = loadingSubs || loadingPlans;
  const error = subsError ?? plansError;

  const currentPlan = subscription?.plan ?? null;
  const currency = currentPlan?.currency ?? "USD";
  const amountMinor = subscription ? billedAmountMinor(subscription) : "0";
  const nextBilling = subscription ? nextBillingDate(subscription) : null;

  const totalPaid = (payments ?? [])
    .filter((payment) => payment.status === "succeeded")
    .reduce((total, payment) => total + Number(payment.amountMinor), 0);

  const runAction = async (action: () => Promise<unknown>) => {
    setActionError(null);
    setBusy(true);
    try {
      await action();
      await Promise.all([refetchSubs(), refetchPayments()]);
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSubscribe = (plan: SubscriptionPlan) => {
    Alert.alert(
      "Start subscription",
      `Subscribe to ${plan.name} (${plan.billingInterval})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Subscribe",
          onPress: () =>
            runAction(() =>
              subscribeToPlan({ planId: plan.id, provider: "pesepay" }),
            ),
        },
      ],
    );
  };

  const handleUpgrade = (plan: SubscriptionPlan) => {
    if (!subscription) return;
    Alert.alert(
      "Change subscription",
      `Switch to ${plan.name} (${plan.billingInterval})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () =>
            runAction(() =>
              changeSubscriptionPlan(subscription.id, {
                planId: plan.id,
                provider: "pesepay",
              }),
            ),
        },
      ],
    );
  };

  const handleCancel = () => {
    if (!subscription) return;
    Alert.alert(
      "Cancel subscription",
      "Your subscription will be cancelled and you'll lose access at the end of the current billing period.",
      [
        { text: "Keep subscription", style: "cancel" },
        {
          text: "Cancel subscription",
          style: "destructive",
          onPress: () => runAction(() => cancelSubscription(subscription.id)),
        },
      ],
    );
  };

  const handleResume = () => {
    if (!subscription) return;
    Alert.alert("Resume subscription", "Reactivate your subscription?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Resume",
        onPress: () => runAction(() => resumeSubscription(subscription.id)),
      },
    ]);
  };

  const visiblePlans = (plans ?? []).filter(
    (plan) => plan.billingInterval === interval && plan.isActive,
  );

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <Header title="Subscription & Billing" />

      <Screen>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView message={error} onRetry={refetchSubs} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* Header */}
            <View className="mb-5">
              <Text className="text-[24px] font-bold text-[#102A43]">
                Manage your subscription
              </Text>

              <Text className="mt-1 text-[13px] leading-5 text-[#6B7280]">
                Manage your plan, billing cycle, payments and subscription
                settings from one place.
              </Text>
            </View>

            {actionError ? (
              <View className="mb-4 rounded-xl border border-[#F4C7C7] bg-[#FFF5F5] px-4 py-3">
                <Text className="text-[12px] font-semibold text-[#A61B1B]">
                  {actionError}
                </Text>
              </View>
            ) : null}

            {!subscription ? (
              /* ── No subscription yet ─────────────────────────── */
              <Card className="mb-4">
                <Text className="text-[18px] font-bold text-[#102A43]">
                  No active subscription
                </Text>
                <Text className="mt-1 text-[13px] leading-5 text-[#6B7280]">
                  You don&apos;t have a subscription yet. Pick a plan below to
                  start managing your properties with billing, reporting and
                  more.
                </Text>
                <View className="mt-4">
                  <Btn
                    label="Browse plans"
                    onPress={() => setActiveTab("plans")}
                  />
                </View>
              </Card>
            ) : (
              <>
                {/* Current subscription hero */}
                <Card className="mb-4 overflow-hidden p-0">
                  <View className="bg-[#0F2C4A] px-5 py-5 rounded-2xl">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-[11px] font-medium uppercase tracking-wider text-[#B7C8D9]">
                          Current plan
                        </Text>

                        <Text className="mt-1 text-[25px] font-bold text-white">
                          {currentPlan?.name ?? "—"}
                        </Text>

                        <Text className="mt-1 text-[12px] text-[#D5E1EA]">
                          Subscription #{subscription.id.slice(0, 8)}
                        </Text>
                      </View>

                      <StatusBadge status={subscription.status} />
                    </View>

                    <View className="mt-5 flex-row">
                      <View className="flex-1">
                        <Text className="text-[10px] text-[#B7C8D9]">
                          BILLING
                        </Text>
                        <Text className="mt-1 text-[15px] font-semibold text-white">
                          {formatMoney(amountMinor, currency)}
                        </Text>
                        <Text className="text-[10px] text-[#B7C8D9]">
                          / {currentPlan?.billingInterval ?? "—"}
                        </Text>
                      </View>

                      <View className="flex-1">
                        <Text className="text-[10px] text-[#B7C8D9]">
                          MANAGED UNITS
                        </Text>
                        <Text className="mt-1 text-[15px] font-semibold text-white">
                          {subscription.managedUnits}
                        </Text>
                        <Text className="text-[10px] text-[#B7C8D9]">
                          active units
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="px-5 py-2">
                    <DetailRow
                      label="Current period"
                      value={`${formatDate(
                        subscription.currentPeriodStart,
                      )} – ${formatDate(subscription.currentPeriodEnd)}`}
                    />

                    <DetailRow
                      label="Next billing date"
                      value={formatDate(nextBilling)}
                    />

                    <DetailRow
                      label="Payment method"
                      value={subscription.provider ?? "Not set"}
                    />

                    <DetailRow
                      label="Payment provider"
                      value={subscription.provider ?? "Not set"}
                      last
                    />
                  </View>

                  <View className="flex-row gap-2 px-5 pb-5">
                    <Btn
                      label="Change plan"
                      className="flex-1"
                      onPress={() => setActiveTab("plans")}
                      disabled={busy}
                    />

                    {subscription.status === "canceled" ? (
                      <Btn
                        label="Resume"
                        variant="outline"
                        className="flex-1"
                        onPress={handleResume}
                        disabled={busy}
                      />
                    ) : (
                      <Btn
                        label="Cancel"
                        variant="outline"
                        className="flex-1"
                        onPress={handleCancel}
                        disabled={busy}
                      />
                    )}
                  </View>
                </Card>

                {subscription.status === "canceled" ? (
                  <View className="mb-4 rounded-xl border border-[#F4C7C7] bg-[#FFF5F5] px-4 py-3">
                    <Text className="text-[12px] font-semibold text-[#A61B1B]">
                      Subscription cancelled
                    </Text>
                    <Text className="mt-1 text-[11px] leading-4 text-[#8B3A3A]">
                      Your subscription has been cancelled. You can resume it to
                      keep managing your properties.
                    </Text>
                  </View>
                ) : null}
              </>
            )}

            {/* Navigation */}
            <View className="mb-4 flex-row rounded-xl bg-[#E9EDF2] p-1">
              {[
                ["overview", "Overview"],
                ["plans", "Plans"],
                ["payments", "Payments"],
              ].map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() =>
                    setActiveTab(value as "overview" | "plans" | "payments")
                  }
                  className={`flex-1 rounded-lg px-2 py-2.5 ${
                    activeTab === value ? "bg-white" : ""
                  }`}
                >
                  <Text
                    className={`text-center text-[12px] font-semibold ${
                      activeTab === value ? "text-[#0F2C4A]" : "text-[#6B7280]"
                    }`}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Overview */}
            {activeTab === "overview" && subscription ? (
              <>
                <View className="mb-4 flex-row gap-3">
                  <Card className="flex-1">
                    <Text className="text-[11px] text-[#6B7280]">
                      Total paid
                    </Text>
                    <Text className="mt-1 text-[18px] font-bold text-[#102A43]">
                      {formatMoney(totalPaid, currency)}
                    </Text>
                    <Text className="mt-1 text-[10px] text-[#9AA5B1]">
                      {(payments ?? []).length} payment records
                    </Text>
                  </Card>

                  <Card className="flex-1">
                    <Text className="text-[11px] text-[#6B7280]">
                      Next charge
                    </Text>
                    <Text className="mt-1 text-[18px] font-bold text-[#102A43]">
                      {formatMoney(amountMinor, currency)}
                    </Text>
                    <Text className="mt-1 text-[10px] text-[#9AA5B1]">
                      {formatDate(nextBilling)}
                    </Text>
                  </Card>
                </View>

                <Card className="mb-4">
                  <Text className="text-[15px] font-bold text-[#102A43]">
                    Billing summary
                  </Text>

                  <DetailRow label="Plan" value={currentPlan?.name ?? "—"} />
                  <DetailRow
                    label="Billing interval"
                    value={currentPlan?.billingInterval ?? "—"}
                  />
                  <DetailRow
                    label="Managed units"
                    value={`${subscription.managedUnits} units`}
                  />
                  <DetailRow
                    label="Price per unit"
                    value={
                      currentPlan?.pricePerUnitMinor
                        ? formatMoney(currentPlan.pricePerUnitMinor, currency)
                        : "Flat rate"
                    }
                  />
                  <DetailRow
                    label="Subscription started"
                    value={formatDate(subscription.startedAt)}
                  />
                  <DetailRow
                    label="Next billing"
                    value={formatDate(nextBilling)}
                    last
                  />
                </Card>

                <Card className="mb-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[15px] font-bold text-[#102A43]">
                      Payment method
                    </Text>
                  </View>

                  <View className="mt-3 rounded-xl border border-[#E6EAF0] bg-[#F8FAFC] px-4 py-4">
                    <Text className="text-[13px] font-semibold text-[#172B4D]">
                      {subscription.provider ?? "No payment method set"}
                    </Text>
                    <Text className="mt-1 text-[11px] text-[#6B7280]">
                      {subscription.provider
                        ? "Default payment method"
                        : "Add a payment method to keep billing running"}
                    </Text>
                  </View>
                </Card>

                <Card>
                  <Text className="text-[15px] font-bold text-[#102A43]">
                    Subscription information
                  </Text>

                  <DetailRow label="Subscription ID" value={subscription.id} />
                  <DetailRow
                    label="Provider"
                    value={subscription.provider ?? "—"}
                  />
                  <DetailRow label="Currency" value={currency} />
                  <DetailRow label="Status" value={subscription.status} />
                  <DetailRow
                    label="Auto-renewal"
                    value={
                      subscription.status === "canceled"
                        ? "Disabled"
                        : "Enabled"
                    }
                    last
                  />
                </Card>
              </>
            ) : null}

            {/* Plans */}
            {activeTab === "plans" ? (
              <>
                <View className="mb-4">
                  <Text className="text-[18px] font-bold text-[#102A43]">
                    Available plans
                  </Text>

                  <Text className="mt-1 text-[12px] text-[#6B7280]">
                    Choose the plan that matches the number of properties you
                    manage.
                  </Text>
                </View>

                <View className="mb-4 flex-row rounded-xl bg-[#E9EDF2] p-1">
                  {(["monthly", "yearly"] as BillingInterval[]).map((value) => (
                    <Pressable
                      key={value}
                      onPress={() => setInterval(value)}
                      className={`flex-1 rounded-lg px-3 py-2.5 ${
                        interval === value ? "bg-white" : ""
                      }`}
                    >
                      <Text
                        className={`text-center text-[12px] font-semibold ${
                          interval === value
                            ? "text-[#0F2C4A]"
                            : "text-[#6B7280]"
                        }`}
                      >
                        {value === "monthly" ? "Monthly" : "Yearly"}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {plansError ? (
                  <ErrorView message={plansError} />
                ) : visiblePlans.length === 0 ? (
                  <Card>
                    <Text className="text-center text-[13px] text-[#6B7280]">
                      No {interval} plans are available right now.
                    </Text>
                  </Card>
                ) : (
                  visiblePlans.map((plan) => {
                    const isCurrent =
                      currentPlan?.id === plan.id &&
                      currentPlan.billingInterval === plan.billingInterval;

                    return (
                      <Card
                        key={plan.id}
                        className={`mb-4 ${
                          isCurrent ? "border border-[#0F766E]" : ""
                        }`}
                      >
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1">
                            <Text className="text-[18px] font-bold text-[#102A43]">
                              {plan.name}
                            </Text>

                            <Text className="mt-1 text-[12px] leading-5 text-[#6B7280]">
                              {plan.description}
                            </Text>
                          </View>

                          {isCurrent ? (
                            <View className="rounded-full bg-[#E8F7F2] px-2.5 py-1">
                              <Text className="text-[10px] font-bold text-[#087F5B]">
                                CURRENT
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View className="mt-4 flex-row items-end">
                          <Text className="text-[25px] font-bold text-[#102A43]">
                            {formatMoney(plan.amountMinor, plan.currency)}
                          </Text>
                          <Text className="mb-1 ml-1 text-[11px] text-[#6B7280]">
                            / {plan.billingInterval}
                          </Text>
                        </View>

                        <Text className="mt-1 text-[11px] text-[#6B7280]">
                          {plan.pricePerUnitMinor
                            ? `${formatMoney(
                                plan.pricePerUnitMinor,
                                plan.currency,
                              )} per managed unit`
                            : "Flat rate"}
                        </Text>

                        <View className="mt-4 border-t border-[#EEF1F4] pt-3">
                          {Object.values(plan.features ?? {}).map((feature) => (
                            <View key={feature} className="mb-2 flex-row">
                              <Text className="mr-2 text-[12px] font-bold text-[#0F766E]">
                                ✓
                              </Text>
                              <Text className="flex-1 text-[12px] text-[#4A5568]">
                                {feature}
                              </Text>
                            </View>
                          ))}
                        </View>

                        <View className="mt-3">
                          {isCurrent ? (
                            <Btn label="Current plan" disabled />
                          ) : subscription ? (
                            <Btn
                              label="Switch to this plan"
                              onPress={() => handleUpgrade(plan)}
                              disabled={busy}
                            />
                          ) : (
                            <Btn
                              label="Subscribe"
                              onPress={() => handleSubscribe(plan)}
                              disabled={busy}
                            />
                          )}
                        </View>
                      </Card>
                    );
                  })
                )}
              </>
            ) : null}

            {/* Payments */}
            {activeTab === "payments" ? (
              <>
                <View className="mb-4">
                  <Text className="text-[18px] font-bold text-[#102A43]">
                    Payment history
                  </Text>

                  <Text className="mt-1 text-[12px] text-[#6B7280]">
                    Review subscription charges, statuses and transaction
                    references.
                  </Text>
                </View>

                {!subscription ? (
                  <Card>
                    <Text className="text-center text-[13px] text-[#6B7280]">
                      Subscribe to a plan to see your payment history.
                    </Text>
                  </Card>
                ) : paymentsError ? (
                  <ErrorView
                    message={paymentsError}
                    onRetry={refetchPayments}
                  />
                ) : loadingPayments ? (
                  <LoadingView />
                ) : (
                  <>
                    <Card className="mb-4">
                      <View className="flex-row justify-between">
                        <View>
                          <Text className="text-[11px] text-[#6B7280]">
                            Successful payments
                          </Text>
                          <Text className="mt-1 text-[20px] font-bold text-[#102A43]">
                            {
                              (payments ?? []).filter(
                                (payment) => payment.status === "succeeded",
                              ).length
                            }
                          </Text>
                        </View>

                        <View>
                          <Text className="text-right text-[11px] text-[#6B7280]">
                            Total paid
                          </Text>
                          <Text className="mt-1 text-right text-[20px] font-bold text-[#102A43]">
                            {formatMoney(totalPaid, currency)}
                          </Text>
                        </View>
                      </View>
                    </Card>

                    {(payments ?? []).length === 0 ? (
                      <Card>
                        <Text className="text-center text-[13px] text-[#6B7280]">
                          No payments recorded yet.
                        </Text>
                      </Card>
                    ) : (
                      (payments ?? []).map((payment) => (
                        <Card key={payment.id} className="mb-3">
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1">
                              <Text className="text-[13px] font-semibold text-[#172B4D]">
                                {currentPlan?.name ?? "Subscription"} payment
                              </Text>

                              <Text className="mt-1 text-[11px] text-[#6B7280]">
                                {formatDate(
                                  payment.paidAt ?? payment.createdAt,
                                )}{" "}
                                · {payment.provider ?? "—"}
                              </Text>
                            </View>

                            <PaymentStatus status={payment.status} />
                          </View>

                          <View className="mt-3 flex-row items-end justify-between">
                            <Text className="text-[17px] font-bold text-[#102A43]">
                              {formatMoney(
                                payment.amountMinor,
                                payment.currency,
                              )}
                            </Text>

                            <Text className="text-[10px] text-[#9AA5B1]">
                              {payment.providerReference ??
                                payment.id.slice(0, 8)}
                            </Text>
                          </View>
                        </Card>
                      ))
                    )}
                  </>
                )}
              </>
            ) : null}
          </ScrollView>
        )}
      </Screen>
    </View>
  );
}
