import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
  Btn,
  Field,
  Header,
  LoadingView,
  ErrorView,
  Screen,
  Select,
  StatusText,
} from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  activateLease,
  getLease,
  getRentCharges,
  terminateLease,
  updateLease,
} from "@/lib/queries";
import { isManagementRole } from "@/lib/roles";
import type { Lease, RentFrequency } from "@/lib/types";
import { useFetch } from "@/lib/useFetch";

const FREQUENCY_OPTIONS = [
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Annually", value: "annually" },
  { label: "Weekly", value: "weekly" },
] as const;

const STATUS_TONE: Record<
  Lease["status"],
  "green" | "amber" | "muted" | "red"
> = {
  active: "green",
  draft: "amber",
  expired: "muted",
  terminated: "red",
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <View className="flex-row justify-between py-2.5 border-b border-[#F4F6F9]">
      <Text className="text-[13px] text-[#6B7280]">{label}</Text>
      <Text className="text-[13px] font-medium text-[#0F2C4A] text-right flex-1 ml-4">
        {value}
      </Text>
    </View>
  );
}

export default function LeaseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const isManager = isManagementRole(user?.role);

  // ── Data ─────────────────────────────────────────────────────
  const leaseFetch = useFetch(() => getLease(id!), [id]);
  const chargesFetch = useFetch(
    () => getRentCharges().then((cs) => cs.filter((c) => c.leaseId === id)),
    [id],
  );

  const lease = leaseFetch.data;
  const charges = chargesFetch.data ?? [];

  // ── Edit state ────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [rentAmount, setRentAmount] = useState("");
  const [frequency, setFrequency] = useState<RentFrequency>("monthly");
  const [endDate, setEndDate] = useState("");
  const [rentDueDay, setRentDueDay] = useState("1");
  const [saving, setSaving] = useState(false);

  function beginEdit() {
    if (!lease) return;
    setRentAmount((Number(lease.rentAmountMinor) / 100).toFixed(2));
    setFrequency((lease.frequency as RentFrequency) ?? "monthly");
    setEndDate(lease.endDate ?? "");
    setRentDueDay(String(lease.rentDueDay ?? 1));
    setEditing(true);
  }

  async function saveEdit() {
    if (!lease) return;
    const numRent = parseFloat(rentAmount);
    if (isNaN(numRent) || numRent <= 0) {
      Alert.alert("Validation", "Please enter a valid rent amount.");
      return;
    }
    setSaving(true);
    try {
      await updateLease(lease.id, {
        rentAmountMinor: Math.round(numRent * 100).toString(),
        frequency,
        endDate: endDate.trim() || undefined,
        rentDueDay: parseInt(rentDueDay, 10) || 1,
      });
      await leaseFetch.refetch();
      setEditing(false);
      Alert.alert("Saved", "Lease terms updated and tenant notified.");
    } catch (err) {
      Alert.alert("Error", apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleActivate() {
    if (!lease) return;
    Alert.alert(
      "Activate Lease",
      "Activate this lease? The first rent charge will be issued immediately to the tenant.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Activate",
          onPress: async () => {
            setSaving(true);
            try {
              await activateLease(lease.id);
              await leaseFetch.refetch();
              await chargesFetch.refetch();
              Alert.alert(
                "Activated",
                "Lease is now active. Rent charge issued.",
              );
            } catch (err) {
              Alert.alert("Error", apiErrorMessage(err));
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  function handleTerminate() {
    if (!lease) return;
    Alert.prompt(
      "Terminate Lease",
      "Provide a reason for termination (optional):",
      async (reason) => {
        setSaving(true);
        try {
          await terminateLease(lease.id, reason || undefined);
          await leaseFetch.refetch();
          Alert.alert(
            "Terminated",
            "Lease has been terminated and tenant notified.",
            [{ text: "OK", onPress: () => router.back() }],
          );
        } catch (err) {
          Alert.alert("Error", apiErrorMessage(err));
        } finally {
          setSaving(false);
        }
      },
      "plain-text",
      "",
    );
  }

  const loading = leaseFetch.loading || chargesFetch.loading;
  const error = leaseFetch.error ?? chargesFetch.error;

  if (loading) {
    return (
      <View className="flex-1 bg-[#F4F6F9]">
        <Header title="Lease" />
        <LoadingView />
      </View>
    );
  }

  if (error || !lease) {
    return (
      <View className="flex-1 bg-[#F4F6F9]">
        <Header title="Lease" />
        <ErrorView
          message={error ?? "Lease not found"}
          onRetry={() => {
            leaseFetch.refetch();
            chargesFetch.refetch();
          }}
        />
      </View>
    );
  }

  const isDraft = lease.status === "draft";
  const isActive = lease.status === "active";
  const isTerminated = lease.status === "terminated";
  const canEdit = isManager && !isTerminated;
  const canActivate = isManager && isDraft;
  const canTerminate = isManager && (isActive || isDraft);

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title={`Lease · ${lease.reference}`} />
      <Screen>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Status badge row */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[18px] font-bold text-[#0F2C4A]">
              {lease.reference}
            </Text>
            <StatusText text={lease.status} tone={STATUS_TONE[lease.status]} />
          </View>

          {/* Details card */}
          <View className="bg-white rounded-xl border border-[#E5E9F0] px-4 mb-4">
            {editing ? (
              /* ── Edit form ── */
              <View className="py-3">
                <Text className="text-[13px] font-semibold text-[#0F2C4A] mb-3">
                  Edit Lease Terms
                </Text>
                <Field
                  label="Rent Amount *"
                  value={rentAmount}
                  onChangeText={setRentAmount}
                  keyboardType="decimal-pad"
                  placeholder="500.00"
                />
                <Select
                  label="Frequency"
                  options={FREQUENCY_OPTIONS}
                  value={frequency}
                  onChange={(v) => setFrequency(v as RentFrequency)}
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Field
                      label="End Date (optional)"
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                  <View className="w-[110px]">
                    <Field
                      label="Due Day"
                      value={rentDueDay}
                      onChangeText={setRentDueDay}
                      keyboardType="number-pad"
                      placeholder="1"
                    />
                  </View>
                </View>
                <View className="flex-row gap-3 mt-3 mb-1">
                  <View className="flex-1">
                    <Btn
                      label={saving ? "Saving..." : "Save Changes"}
                      disabled={saving}
                      onPress={saveEdit}
                    />
                  </View>
                  <View className="flex-1">
                    <Btn
                      label="Cancel"
                      variant="outline"
                      onPress={() => setEditing(false)}
                    />
                  </View>
                </View>
              </View>
            ) : (
              /* ── Read-only details ── */
              <>
                <DetailRow label="Start date" value={lease.startDate} />
                <DetailRow
                  label="End date"
                  value={lease.endDate ?? "Month-to-month"}
                />
                <DetailRow
                  label="Rent"
                  value={`${(Number(lease.rentAmountMinor) / 100).toFixed(2)} ${lease.currency}`}
                />
                <DetailRow label="Frequency" value={lease.frequency ?? "—"} />
                <DetailRow
                  label="Due day"
                  value={`Day ${lease.rentDueDay ?? 1}`}
                />
                <DetailRow
                  label="Deposit"
                  value={
                    lease.depositMinor && Number(lease.depositMinor) > 0
                      ? `${(Number(lease.depositMinor) / 100).toFixed(2)} ${lease.currency}`
                      : "None"
                  }
                />
                {lease.activatedAt ? (
                  <DetailRow
                    label="Activated"
                    value={new Date(lease.activatedAt).toLocaleDateString()}
                  />
                ) : null}
                {lease.terminatedAt ? (
                  <DetailRow
                    label="Terminated"
                    value={new Date(lease.terminatedAt).toLocaleDateString()}
                  />
                ) : null}
                {lease.terminationReason ? (
                  <DetailRow label="Reason" value={lease.terminationReason} />
                ) : null}
              </>
            )}
          </View>

          {/* Rent Charges */}
          {charges.length > 0 && (
            <>
              <Text className="text-[14px] font-semibold text-[#0F2C4A] mb-2">
                Rent Charges
              </Text>
              <View className="bg-white rounded-xl border border-[#E5E9F0] px-4 mb-4">
                {charges.map((c, i) => (
                  <View
                    key={c.id}
                    className={`flex-row justify-between py-2.5 ${
                      i < charges.length - 1 ? "border-b border-[#F4F6F9]" : ""
                    }`}
                  >
                    <View>
                      <Text className="text-[12px] text-[#0F2C4A] font-medium">
                        {c.periodStart} → {c.periodEnd}
                      </Text>
                      <Text className="text-[11px] text-[#6B7280]">
                        Due: {c.dueDate}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                        {(Number(c.amountMinor) / 100).toFixed(2)} {c.currency}
                      </Text>
                      <Text
                        className={`text-[11px] capitalize ${
                          c.status === "paid"
                            ? "text-green-600"
                            : c.status === "outstanding"
                              ? "text-amber-600"
                              : "text-[#6B7280]"
                        }`}
                      >
                        {c.status.replace("_", " ")}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Management Actions */}
          {canEdit && !editing && (
            <Btn
              label="Edit Lease Terms"
              icon="create-outline"
              variant="outline"
              onPress={beginEdit}
              className="mb-3"
            />
          )}
          {canActivate && (
            <Btn
              label={saving ? "Activating..." : "Activate Lease"}
              icon="checkmark-circle-outline"
              onPress={handleActivate}
              disabled={saving}
              className="mb-3"
            />
          )}
          {canTerminate && (
            <TouchableOpacity
              onPress={handleTerminate}
              disabled={saving}
              className="flex-row items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-xl py-3 mb-8"
            >
              <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
              <Text className="text-[14px] font-semibold text-red-600">
                {saving ? "Processing..." : "Terminate Lease"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Screen>
    </View>
  );
}
