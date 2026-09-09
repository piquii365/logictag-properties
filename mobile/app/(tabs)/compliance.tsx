import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import {
  Badge,
  Card,
  ErrorView,
  Header,
  LoadingView,
  Screen,
  SectionTitle,
  StatusText,
  Btn,
  Field,
} from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import {
  createComplianceProfile,
  getComplianceProfiles,
  getTaxObligations,
} from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import { useState } from "react";

function statusTone(status: string): "green" | "amber" | "red" | "muted" {
  if (status === "paid" || status === "confirmed") return "green";
  if (status === "overdue") return "red";
  if (status === "due") return "amber";
  return "muted";
}

export default function Compliance() {
  const profiles = useFetch(getComplianceProfiles);
  const obligations = useFetch(() => getTaxObligations(), []);
  const loading = profiles.loading || obligations.loading;
  const error = profiles.error ?? obligations.error;
  const profile = profiles.data?.[0];
  const [tin, setTin] = useState("");
  const [taxpayerName, setTaxpayerName] = useState("");
  const [taxpayerType, setTaxpayerType] = useState("individual");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function saveProfile() {
    if (!tin.trim()) {
      setFormError("TIN is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createComplianceProfile({
        tin: tin.trim(),
        taxpayerName: taxpayerName.trim() || undefined,
        taxpayerType: taxpayerType.trim() || "individual",
      });
      await profiles.refetch();
      setTin("");
      setTaxpayerName("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save ZIMRA profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Compliance" />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              profiles.refetch();
              obligations.refetch();
            }}
          />
        ) : (
          <>
            <Card>
              <View className="flex-row items-center">
                <View className="h-11 w-11 rounded-full bg-[#DCFCE7] items-center justify-center">
                  <Ionicons name="shield-checkmark" size={23} color="#16A34A" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[16px] font-semibold text-[#0F2C4A]">
                    ZIMRA readiness
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-1">
                    {profile ? "Profile registered" : "Profile not registered"}
                  </Text>
                </View>
                <Badge
                  text={profile ? "Ready" : "Action needed"}
                  tone={profile ? "green" : "amber"}
                />
              </View>
              {profile ? (
                <View className="mt-4 border-t border-[#F1F5F9] pt-2">
                  <View className="flex-row justify-between py-2">
                    <Text className="text-[13px] text-[#6B7280]">TIN</Text>
                    <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                      {profile.tin}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-[13px] text-[#6B7280]">
                      Taxpayer type
                    </Text>
                    <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                      {profile.taxpayerType}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-2">
                    <Text className="text-[13px] text-[#6B7280]">
                      VAT registered
                    </Text>
                    <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                      {profile.vatRegistered ? "Yes" : "No"}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Card>

            {!profile ? (
              <Card className="mt-3">
                <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-3">
                  Add ZIMRA details
                </Text>
                <Field label="TIN" value={tin} onChangeText={setTin} />
                <Field
                  label="Taxpayer name"
                  value={taxpayerName}
                  onChangeText={setTaxpayerName}
                />
                <Field
                  label="Taxpayer type"
                  value={taxpayerType}
                  onChangeText={setTaxpayerType}
                />
                {formError ? (
                  <Text className="text-[13px] text-[#DC2626] mb-3">
                    {formError}
                  </Text>
                ) : null}
                <Btn
                  label={saving ? "Saving..." : "Save ZIMRA details"}
                  onPress={saveProfile}
                  disabled={saving}
                />
              </Card>
            ) : null}

            <SectionTitle>Tax obligations</SectionTitle>
            {(obligations.data ?? []).length === 0 ? (
              <Card>
                <Text className="text-[13px] text-[#6B7280]">
                  No tax obligations recorded.
                </Text>
              </Card>
            ) : (
              (obligations.data ?? []).map((obligation) => (
                <Card key={obligation.id} className="mb-3">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                        {obligation.taxType.replaceAll("_", " ")}
                      </Text>
                      <Text className="text-[12px] text-[#6B7280] mt-1">
                        {obligation.taxPeriodStart} to {obligation.taxPeriodEnd}
                      </Text>
                    </View>
                    <StatusText
                      text={obligation.status}
                      tone={statusTone(obligation.status)}
                    />
                  </View>
                  <View className="flex-row items-end justify-between mt-4">
                    <View>
                      <Text className="text-[11px] text-[#6B7280]">
                        Tax due
                      </Text>
                      <Text className="text-[18px] font-bold text-[#0F2C4A] mt-1">
                        {money(centsToDollars(obligation.taxAmount))}
                      </Text>
                    </View>
                    <Text className="text-[12px] text-[#6B7280]">
                      Due {obligation.dueDate}
                    </Text>
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </Screen>
    </View>
  );
}
