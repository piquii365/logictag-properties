import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { Pressable, Text, View } from "react-native";
import {
  Badge,
  Divider,
  ErrorView,
  Group,
  Header,
  LoadingView,
  Screen,
  SectionTitle,
  StatusText,
  Btn,
  Field,
  Select,
} from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import { apiErrorMessage, BASE_URL } from "@/lib/api";
import {
  createComplianceProfile,
  getComplianceProfiles,
  getTaxObligations,
  getTaxReturns,
  removeComplianceDocument,
  taxReturnPdfUrl,
  uploadComplianceDocument,
} from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import { useState } from "react";

function statusTone(status: string): "green" | "amber" | "red" | "muted" {
  if (status === "paid" || status === "confirmed") return "green";
  if (status === "overdue") return "red";
  if (status === "due") return "amber";
  return "muted";
}

const TAXPAYER_TYPES = [
  { label: "Individual", value: "individual" },
  { label: "Company", value: "company" },
  { label: "Trust", value: "trust" },
  { label: "Partnership", value: "partnership" },
  { label: "Non-profit organisation", value: "non_profit" },
  { label: "Government / Parastatal", value: "government" },
] as const;

export default function Compliance() {
  const profiles = useFetch(getComplianceProfiles);
  const obligations = useFetch(() => getTaxObligations(), []);
  const taxReturns = useFetch(() => getTaxReturns(), []);
  const loading = profiles.loading || obligations.loading || taxReturns.loading;
  const error = profiles.error ?? obligations.error ?? taxReturns.error;
  const profile = profiles.data?.[0];
  const [tin, setTin] = useState("");
  const [taxpayerName, setTaxpayerName] = useState("");
  const [taxpayerType, setTaxpayerType] = useState("individual");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function pickAndUploadDocument() {
    if (!profile) return;
    setActionError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setActionError("Photo library access is needed to upload a document.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      await uploadComplianceDocument(profile.id, {
        uri: asset.uri,
        name: asset.fileName ?? "document.jpg",
        type: asset.mimeType ?? "image/jpeg",
      });
      await profiles.refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(documentId: string) {
    if (!profile) return;
    setActionError(null);
    try {
      await removeComplianceDocument(profile.id, documentId);
      await profiles.refetch();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  }

  async function openTaxReturn(id: string) {
    await WebBrowser.openBrowserAsync(taxReturnPdfUrl(id));
  }

  async function saveProfile() {
    const cleanTin = tin.trim();
    if (!cleanTin) {
      setFormError("TIN is required.");
      return;
    }
    if (!/^\d{9}$/.test(cleanTin)) {
      setFormError("TIN must be a 9-digit number (e.g. 012345678).");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createComplianceProfile({
        tin: cleanTin,
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
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
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
              <Group className="mt-4">
                <View className="px-4 py-2.5">
                  <View className="flex-row justify-between py-1">
                    <Text className="text-[13px] text-[#6B7280]">TIN</Text>
                    <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                      {profile.tin}
                    </Text>
                  </View>
                </View>
                <Divider />
                <View className="px-4 py-2.5">
                  <View className="flex-row justify-between py-1">
                    <Text className="text-[13px] text-[#6B7280]">
                      Taxpayer type
                    </Text>
                    <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                      {profile.taxpayerType}
                    </Text>
                  </View>
                </View>
                <Divider />
                <View className="px-4 py-2.5">
                  <View className="flex-row justify-between py-1">
                    <Text className="text-[13px] text-[#6B7280]">
                      VAT registered
                    </Text>
                    <Text className="text-[13px] font-semibold text-[#0F2C4A]">
                      {profile.vatRegistered ? "Yes" : "No"}
                    </Text>
                  </View>
                </View>
              </Group>
            ) : null}

            {!profile ? (
              <View className="mt-5">
                <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-3">
                  Add ZIMRA details
                </Text>
                <Field
                  label="TIN"
                  value={tin}
                  onChangeText={setTin}
                  keyboardType="number-pad"
                  maxLength={9}
                  hint="9-digit ZIMRA tax number"
                />
                <Field
                  label="Taxpayer name"
                  value={taxpayerName}
                  onChangeText={setTaxpayerName}
                />
                <Select
                  label="Taxpayer type"
                  options={TAXPAYER_TYPES}
                  value={taxpayerType}
                  onChange={setTaxpayerType}
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
              </View>
            ) : null}

            <SectionTitle>Tax obligations</SectionTitle>
            {(obligations.data ?? []).length === 0 ? (
              <Text className="text-[13px] text-[#6B7280]">
                No tax obligations recorded.
              </Text>
            ) : (
              (obligations.data ?? []).map((obligation) => (
                <View
                  key={obligation.id}
                  className="border border-[#E5E9F0] rounded-lg bg-white px-4 py-3.5 mb-3"
                >
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
                  <View className="flex-row items-end justify-between mt-4 pt-3 border-t border-[#E5E9F0]">
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
                </View>
              ))
            )}

            {profile ? (
              <>
                <SectionTitle>Documents</SectionTitle>
                {actionError ? (
                  <Text className="text-[13px] text-[#DC2626] mb-2">
                    {actionError}
                  </Text>
                ) : null}
                <Btn
                  label={uploading ? "Uploading..." : "Upload document"}
                  onPress={pickAndUploadDocument}
                  disabled={uploading}
                  variant="outline"
                />
                {(profile.documents ?? []).length === 0 ? (
                  <Text className="text-[13px] text-[#6B7280] mt-3">
                    No documents uploaded yet. Upload ZIMRA-related documents
                    such as ITF263, VAT returns or correspondence.
                  </Text>
                ) : (
                  <Group className="mt-3">
                    {(profile.documents ?? []).map((doc, i) => (
                      <View key={doc.id}>
                        {i > 0 ? <Divider /> : null}
                        <View className="flex-row items-center px-4 py-3">
                          <Ionicons
                            name="document-text-outline"
                            size={20}
                            color="#0F2C4A"
                          />
                          <View className="ml-3 flex-1">
                            <Text className="text-[14px] font-medium text-[#0F2C4A]">
                              {doc.name}
                            </Text>
                            <Text className="text-[11px] text-[#6B7280] mt-0.5">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => deleteDocument(doc.id)}
                            hitSlop={8}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={19}
                              color="#DC2626"
                            />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </Group>
                )}

                <SectionTitle>Tax returns</SectionTitle>
                {(taxReturns.data ?? []).length === 0 ? (
                  <Text className="text-[13px] text-[#6B7280]">
                    No tax returns filed yet.
                  </Text>
                ) : (
                  <Group>
                    {(taxReturns.data ?? []).map((taxReturn, i) => (
                      <View key={taxReturn.id}>
                        {i > 0 ? <Divider /> : null}
                        <View className="flex-row items-center justify-between px-4 py-3">
                          <View className="flex-1 pr-2">
                            <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                              {taxReturn.taxType.replaceAll("_", " ")}
                            </Text>
                            <Text className="text-[12px] text-[#6B7280] mt-1">
                              {taxReturn.taxPeriodStart} to{" "}
                              {taxReturn.taxPeriodEnd}
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => openTaxReturn(taxReturn.id)}
                            className="flex-row items-center rounded-lg bg-[#0F2C4A] px-3 py-2"
                          >
                            <Ionicons
                              name="download-outline"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text className="text-[12px] font-semibold text-white ml-1">
                              PDF
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </Group>
                )}
              </>
            ) : null}
          </>
        )}
      </Screen>
    </View>
  );
}
