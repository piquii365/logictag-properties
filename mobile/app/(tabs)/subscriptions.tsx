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

type BillingInterval = "monthly" | "yearly";

type Subscription = {
  id: string;
  planName: string;
  status: "active" | "trialing" | "past_due" | "cancelled";
  billingInterval: BillingInterval;
  managedUnits: number;
  amountMinor: number;
  pricePerUnitMinor?: number;
  currency: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  startedAt: string;
  trialEndsAt?: string;
  cancelAtPeriodEnd: boolean;
  paymentMethod: string;
  provider: string;
};

type Payment = {
  id: string;
  date: string;
  description: string;
  amountMinor: number;
  status: "succeeded" | "pending" | "failed" | "refunded";
  method: string;
  reference: string;
};

type Plan = {
  id: string;
  name: string;
  description: string;
  billingInterval: BillingInterval;
  amountMinor: number;
  pricePerUnitMinor?: number;
  includedUnits: number;
  trialDays: number;
  features: string[];
};

const PLACEHOLDER_SUBSCRIPTION: Subscription = {
  id: "SUB-000123",
  planName: "Professional",
  status: "active",
  billingInterval: "monthly",
  managedUnits: 12,
  amountMinor: 15000,
  pricePerUnitMinor: 1250,
  currency: "USD",
  currentPeriodStart: "2026-09-01",
  currentPeriodEnd: "2026-09-30",
  nextBillingDate: "2026-10-01",
  startedAt: "2026-01-15",
  cancelAtPeriodEnd: false,
  paymentMethod: "Pesepay •••• 4821",
  provider: "Pesepay",
};

const PLACEHOLDER_PAYMENTS: Payment[] = [
  {
    id: "PAY-001",
    date: "2026-09-01",
    description: "Professional subscription",
    amountMinor: 15000,
    status: "succeeded",
    method: "Pesepay",
    reference: "PES-20260901-001",
  },
  {
    id: "PAY-002",
    date: "2026-08-01",
    description: "Professional subscription",
    amountMinor: 15000,
    status: "succeeded",
    method: "Pesepay",
    reference: "PES-20260801-014",
  },
  {
    id: "PAY-003",
    date: "2026-07-01",
    description: "Professional subscription",
    amountMinor: 15000,
    status: "succeeded",
    method: "Pesepay",
    reference: "PES-20260701-029",
  },
];

const PLACEHOLDER_PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For landlords managing a small portfolio.",
    billingInterval: "monthly",
    amountMinor: 5000,
    pricePerUnitMinor: 500,
    includedUnits: 10,
    trialDays: 14,
    features: [
      "Up to 10 managed units",
      "Tenant management",
      "Rent and payment tracking",
      "Basic reports",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description: "For growing property managers and agencies.",
    billingInterval: "monthly",
    amountMinor: 15000,
    pricePerUnitMinor: 1250,
    includedUnits: 50,
    trialDays: 14,
    features: [
      "Up to 50 managed units",
      "Advanced reporting",
      "Maintenance management",
      "Payment integrations",
      "Tenant communications",
    ],
  },
  {
    id: "business",
    name: "Business",
    description: "For larger property portfolios and teams.",
    billingInterval: "yearly",
    amountMinor: 150000,
    pricePerUnitMinor: 1000,
    includedUnits: 250,
    trialDays: 30,
    features: [
      "Up to 250 managed units",
      "Advanced analytics",
      "Automated billing",
      "Compliance reporting",
      "Priority support",
    ],
  },
];

function formatMoney(minor: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

function formatDate(value?: string) {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: Subscription["status"] }) {
  const labels = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past due",
    cancelled: "Cancelled",
  };

  return (
    <View className="rounded-full bg-[#E8F7F2] px-3 py-1">
      <Text className="text-[11px] font-semibold text-[#087F5B]">
        {labels[status]}
      </Text>
    </View>
  );
}

function PaymentStatus({ status }: { status: Payment["status"] }) {
  const styles = {
    succeeded: "bg-[#E8F7F2] text-[#087F5B]",
    pending: "bg-[#FFF7E6] text-[#B7791F]",
    failed: "bg-[#FDECEC] text-[#C53030]",
    refunded: "bg-[#EEF2FF] text-[#4C51BF]",
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

export default function SubscriptionManagement() {
  const [activeTab, setActiveTab] = useState<"overview" | "plans" | "payments">(
    "overview",
  );

  const [subscription, setSubscription] = useState(PLACEHOLDER_SUBSCRIPTION);

  const [payments] = useState(PLACEHOLDER_PAYMENTS);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [busy, setBusy] = useState(false);
  const [error] = useState<string | null>(null);

  const currentPlan = useMemo(
    () =>
      PLACEHOLDER_PLANS.find(
        (plan) =>
          plan.name.toLowerCase() === subscription.planName.toLowerCase(),
      ),
    [subscription.planName],
  );

  const totalPaid = payments
    .filter((payment) => payment.status === "succeeded")
    .reduce((total, payment) => total + payment.amountMinor, 0);

  const occupiedUnits = subscription.managedUnits;

  const handleUpgrade = (plan: Plan) => {
    Alert.alert(
      "Change subscription",
      `Switch to ${plan.name}? This is currently a placeholder action.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            setBusy(true);

            setTimeout(() => {
              setSubscription((current) => ({
                ...current,
                planName: plan.name,
                billingInterval: plan.billingInterval,
                amountMinor: plan.amountMinor,
                pricePerUnitMinor: plan.pricePerUnitMinor,
              }));
              setBusy(false);
            }, 500);
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel subscription",
      "Your subscription will remain active until the end of the current billing period. This is a placeholder action.",
      [
        { text: "Keep subscription", style: "cancel" },
        {
          text: "Cancel at period end",
          style: "destructive",
          onPress: () => {
            setSubscription((current) => ({
              ...current,
              cancelAtPeriodEnd: true,
            }));
          },
        },
      ],
    );
  };

  const handleResume = () => {
    setSubscription((current) => ({
      ...current,
      cancelAtPeriodEnd: false,
    }));
  };

  return (
    <View className="flex-1 bg-[#F5F7FA]">
      <Header title="Subscription & Billing" />

      <Screen>
        {error ? (
          <ErrorView message={error} onRetry={() => {}} />
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

            {/* Current subscription hero */}
            <Card className="mb-4 overflow-hidden p-0">
              <View className="bg-[#0F2C4A] px-5 py-5">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-[11px] font-medium uppercase tracking-wider text-[#B7C8D9]">
                      Current plan
                    </Text>

                    <Text className="mt-1 text-[25px] font-bold text-white">
                      {subscription.planName}
                    </Text>

                    <Text className="mt-1 text-[12px] text-[#D5E1EA]">
                      Subscription #{subscription.id}
                    </Text>
                  </View>

                  <StatusBadge status={subscription.status} />
                </View>

                <View className="mt-5 flex-row">
                  <View className="flex-1">
                    <Text className="text-[10px] text-[#B7C8D9]">BILLING</Text>
                    <Text className="mt-1 text-[15px] font-semibold text-white">
                      {formatMoney(
                        subscription.amountMinor,
                        subscription.currency,
                      )}
                    </Text>
                    <Text className="text-[10px] text-[#B7C8D9]">
                      / {subscription.billingInterval}
                    </Text>
                  </View>

                  <View className="flex-1">
                    <Text className="text-[10px] text-[#B7C8D9]">
                      MANAGED UNITS
                    </Text>
                    <Text className="mt-1 text-[15px] font-semibold text-white">
                      {occupiedUnits}
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
                  value={formatDate(subscription.nextBillingDate)}
                />

                <DetailRow
                  label="Payment method"
                  value={subscription.paymentMethod}
                />

                <DetailRow
                  label="Payment provider"
                  value={subscription.provider}
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

                {subscription.cancelAtPeriodEnd ? (
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

            {subscription.cancelAtPeriodEnd ? (
              <View className="mb-4 rounded-xl border border-[#F4C7C7] bg-[#FFF5F5] px-4 py-3">
                <Text className="text-[12px] font-semibold text-[#A61B1B]">
                  Cancellation scheduled
                </Text>
                <Text className="mt-1 text-[11px] leading-4 text-[#8B3A3A]">
                  Your subscription is scheduled to end on{" "}
                  {formatDate(subscription.currentPeriodEnd)}. You can resume it
                  before that date.
                </Text>
              </View>
            ) : null}

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
            {activeTab === "overview" ? (
              <>
                <View className="mb-4 flex-row gap-3">
                  <Card className="flex-1">
                    <Text className="text-[11px] text-[#6B7280]">
                      Total paid
                    </Text>
                    <Text className="mt-1 text-[18px] font-bold text-[#102A43]">
                      {formatMoney(totalPaid, subscription.currency)}
                    </Text>
                    <Text className="mt-1 text-[10px] text-[#9AA5B1]">
                      {payments.length} payment records
                    </Text>
                  </Card>

                  <Card className="flex-1">
                    <Text className="text-[11px] text-[#6B7280]">
                      Next charge
                    </Text>
                    <Text className="mt-1 text-[18px] font-bold text-[#102A43]">
                      {formatMoney(
                        subscription.amountMinor,
                        subscription.currency,
                      )}
                    </Text>
                    <Text className="mt-1 text-[10px] text-[#9AA5B1]">
                      {formatDate(subscription.nextBillingDate)}
                    </Text>
                  </Card>
                </View>

                <Card className="mb-4">
                  <Text className="text-[15px] font-bold text-[#102A43]">
                    Billing summary
                  </Text>

                  <DetailRow label="Plan" value={subscription.planName} />
                  <DetailRow
                    label="Billing interval"
                    value={subscription.billingInterval}
                  />
                  <DetailRow
                    label="Managed units"
                    value={`${subscription.managedUnits} units`}
                  />
                  <DetailRow
                    label="Price per unit"
                    value={
                      subscription.pricePerUnitMinor
                        ? formatMoney(
                            subscription.pricePerUnitMinor,
                            subscription.currency,
                          )
                        : "Placeholder"
                    }
                  />
                  <DetailRow
                    label="Subscription started"
                    value={formatDate(subscription.startedAt)}
                  />
                  <DetailRow
                    label="Next billing"
                    value={formatDate(subscription.nextBillingDate)}
                    last
                  />
                </Card>

                <Card className="mb-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[15px] font-bold text-[#102A43]">
                      Payment method
                    </Text>

                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          "Payment method",
                          "Payment method management is a placeholder.",
                        )
                      }
                    >
                      <Text className="text-[12px] font-semibold text-[#0F766E]">
                        Manage
                      </Text>
                    </Pressable>
                  </View>

                  <View className="mt-3 rounded-xl border border-[#E6EAF0] bg-[#F8FAFC] px-4 py-4">
                    <Text className="text-[13px] font-semibold text-[#172B4D]">
                      {subscription.paymentMethod}
                    </Text>
                    <Text className="mt-1 text-[11px] text-[#6B7280]">
                      Default payment method · {subscription.provider}
                    </Text>
                  </View>
                </Card>

                <Card>
                  <Text className="text-[15px] font-bold text-[#102A43]">
                    Subscription information
                  </Text>

                  <DetailRow label="Subscription ID" value={subscription.id} />
                  <DetailRow label="Provider" value={subscription.provider} />
                  <DetailRow label="Currency" value={subscription.currency} />
                  <DetailRow label="Status" value={subscription.status} />
                  <DetailRow
                    label="Auto-renewal"
                    value={
                      subscription.cancelAtPeriodEnd ? "Disabled" : "Enabled"
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

                {PLACEHOLDER_PLANS.filter(
                  (plan) => plan.billingInterval === interval,
                ).map((plan) => {
                  const isCurrent =
                    plan.name.toLowerCase() ===
                    subscription.planName.toLowerCase();

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
                          {formatMoney(plan.amountMinor, subscription.currency)}
                        </Text>
                        <Text className="mb-1 ml-1 text-[11px] text-[#6B7280]">
                          / {plan.billingInterval}
                        </Text>
                      </View>

                      <Text className="mt-1 text-[11px] text-[#6B7280]">
                        {plan.pricePerUnitMinor
                          ? `${formatMoney(
                              plan.pricePerUnitMinor,
                              subscription.currency,
                            )} per managed unit`
                          : "Custom unit pricing"}
                      </Text>

                      <View className="mt-4 border-t border-[#EEF1F4] pt-3">
                        {plan.features.map((feature) => (
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
                        ) : (
                          <Btn
                            label="Switch to this plan"
                            onPress={() => handleUpgrade(plan)}
                            disabled={busy}
                          />
                        )}
                      </View>
                    </Card>
                  );
                })}

                <Text className="mb-4 text-center text-[10px] leading-4 text-[#9AA5B1]">
                  Prices shown above are placeholders. Replace these values with
                  your API subscription-plan data before production.
                </Text>
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

                <Card className="mb-4">
                  <View className="flex-row justify-between">
                    <View>
                      <Text className="text-[11px] text-[#6B7280]">
                        Successful payments
                      </Text>
                      <Text className="mt-1 text-[20px] font-bold text-[#102A43]">
                        {
                          payments.filter(
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
                        {formatMoney(totalPaid, subscription.currency)}
                      </Text>
                    </View>
                  </View>
                </Card>

                {payments.map((payment) => (
                  <Card key={payment.id} className="mb-3">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-[13px] font-semibold text-[#172B4D]">
                          {payment.description}
                        </Text>

                        <Text className="mt-1 text-[11px] text-[#6B7280]">
                          {formatDate(payment.date)} · {payment.method}
                        </Text>
                      </View>

                      <PaymentStatus status={payment.status} />
                    </View>

                    <View className="mt-3 flex-row items-end justify-between">
                      <Text className="text-[17px] font-bold text-[#102A43]">
                        {formatMoney(
                          payment.amountMinor,
                          subscription.currency,
                        )}
                      </Text>

                      <Text className="text-[10px] text-[#9AA5B1]">
                        {payment.reference}
                      </Text>
                    </View>
                  </Card>
                ))}

                <Btn
                  label="Download billing history"
                  variant="outline"
                  onPress={() =>
                    Alert.alert(
                      "Billing history",
                      "PDF/CSV export is a placeholder action.",
                    )
                  }
                  disabled={busy}
                />
              </>
            ) : null}
          </ScrollView>
        )}
      </Screen>
    </View>
  );
}
