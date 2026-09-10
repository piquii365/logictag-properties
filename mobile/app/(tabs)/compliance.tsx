import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Badge,
  Btn,
  Divider,
  ErrorView,
  Field,
  Group,
  Header,
  LoadingView,
  Screen,
  SectionTitle,
  Select,
  StatusText,
} from "@/components/ui";
import { centsToDollars, money, moneyIn } from "@/lib/data";
import { apiErrorMessage } from "@/lib/api";
import {
  createComplianceProfile,
  createTaxObligation,
  generateTaxReturn,
  getComplianceProfiles,
  getTaxObligations,
  getTaxReturns,
  getTaxRules,
  removeComplianceDocument,
  taxReturnPdfUrl,
  uploadComplianceDocument,
} from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { TaxRule } from "@/lib/types";

function statusTone(status: string): "green" | "amber" | "red" | "muted" {
  if (status === "paid" || status === "confirmed" || status === "filed")
    return "green";
  if (status === "overdue") return "red";
  if (status === "due" || status === "pending") return "amber";
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

const TAX_TYPES = [
  { label: "Income tax (rental)", value: "income_tax" },
  { label: "Presumptive tax", value: "presumptive_tax" },
  { label: "Value added tax (VAT)", value: "vat" },
  { label: "Withholding tax", value: "withholding_tax" },
  { label: "Capital gains tax", value: "capital_gains_tax" },
  { label: "Pay-as-you-earn (PAYE)", value: "paye" },
] as const;

const MONTHS = [
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
] as const;

/** ZIMRA-related document categories a user can tag an upload with. */
const DOCUMENT_TYPES = [
  { label: "ITF263 (Tax Clearance)", value: "itf263" },
  { label: "TIN Certificate", value: "tin_certificate" },
  { label: "VAT Registration Certificate", value: "vat_certificate" },
  { label: "VAT Return", value: "vat_return" },
  { label: "Income Tax Return", value: "income_tax_return" },
  { label: "PAYE Return", value: "paye_return" },
  { label: "Withholding Tax Certificate", value: "withholding_certificate" },
  { label: "Tax Clearance Certificate", value: "tax_clearance" },
  { label: "ZIMRA Correspondence", value: "correspondence" },
  { label: "Other", value: "other" },
] as const;

const DOCUMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.value, d.label]),
);

const CURRENCIES = [
  { label: "USD", value: "USD" },
  { label: "ZWG", value: "ZWG" },
  { label: "ZAR", value: "ZAR" },
] as const;

const TABS = ["Overview", "Returns", "Obligations", "Rules"] as const;
type Tab = (typeof TABS)[number];

/** First and last day of the tax year that ends in `endMonth`, for `year`. */
function taxYearRange(year: number, endMonth: number) {
  const startMonth = endMonth === 12 ? 1 : endMonth + 1;
  const startYear = endMonth === 12 ? year : year - 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, endMonth, 0).getDate();
  return {
    start: `${startYear}-${pad(startMonth)}-01`,
    end: `${year}-${pad(endMonth)}-${pad(lastDay)}`,
  };
}

function formatRate(rate: string) {
  const n = Number(rate);
  if (!Number.isFinite(n)) return rate;
  const pct = n * 100;
  return `${pct.toFixed(pct % 1 === 0 ? 0 : 2)}%`;
}

export default function Compliance() {
  const profiles = useFetch(getComplianceProfiles);
  const obligations = useFetch(() => getTaxObligations(), []);
  const taxReturns = useFetch(() => getTaxReturns(), []);
  const rules = useFetch(() => getTaxRules(), []);
  const loading = profiles.loading || obligations.loading || taxReturns.loading;
  const error = profiles.error ?? obligations.error ?? taxReturns.error;
  const profile = profiles.data?.[0];

  const [tab, setTab] = useState<Tab>("Overview");
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Profile form
  const [tin, setTin] = useState("");
  const [taxpayerName, setTaxpayerName] = useState("");
  const [taxpayerType, setTaxpayerType] = useState("individual");
  const [vatRegistered, setVatRegistered] = useState(false);
  const [vatNumber, setVatNumber] = useState("");
  const [presumptive, setPresumptive] = useState(false);
  const [itf263, setItf263] = useState("");
  const [taxYearEndMonth, setTaxYearEndMonth] = useState("12");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [documentType, setDocumentType] = useState<string>("itf263");

  // Return generation form
  const [returnTaxType, setReturnTaxType] = useState("income_tax");
  const [returnYear, setReturnYear] = useState(
    String(new Date().getFullYear()),
  );
  const [returnCurrency, setReturnCurrency] = useState("USD");
  const [generating, setGenerating] = useState(false);

  // Obligation form
  const [obTaxType, setObTaxType] = useState("income_tax");
  const [obPeriodStart, setObPeriodStart] = useState("");
  const [obPeriodEnd, setObPeriodEnd] = useState("");
  const [obTaxable, setObTaxable] = useState("");
  const [obDueDate, setObDueDate] = useState("");
  const [obCurrency, setObCurrency] = useState("USD");
  const [savingObligation, setSavingObligation] = useState(false);

  const yearEnd = Number(taxYearEndMonth) || 12;
  const returnRange = useMemo(
    () => taxYearRange(Number(returnYear) || new Date().getFullYear(), yearEnd),
    [returnYear, yearEnd],
  );

  const activeRules = useMemo(
    () => (rules.data ?? []).filter((r) => r.active),
    [rules.data],
  );

  const totals = useMemo(() => {
    const list = taxReturns.data ?? [];
    let due = 0n;
    let paid = 0n;
    for (const r of list) {
      due += BigInt(r.taxDue || "0");
      paid += BigInt(r.taxPaid || "0");
    }
    return { due, paid, balance: due - paid, count: list.length };
  }, [taxReturns.data]);

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
        documentType,
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
    if (vatRegistered && !vatNumber.trim()) {
      setFormError("Enter the VAT registration number, or turn VAT off.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await createComplianceProfile({
        tin: cleanTin,
        taxpayerName: taxpayerName.trim() || undefined,
        taxpayerType: taxpayerType.trim() || "individual",
        vatRegistered,
        vatNumber: vatRegistered ? vatNumber.trim() : undefined,
        presumptiveRentalRegistered: presumptive,
        taxYearEndMonth: Number(taxYearEndMonth) || 12,
      });
      await profiles.refetch();
      setTin("");
      setTaxpayerName("");
      setVatNumber("");
      setItf263("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not save ZIMRA profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function runGenerateReturn() {
    if (!profile) return;
    setActionError(null);
    setNotice(null);
    setGenerating(true);
    try {
      await generateTaxReturn({
        zimraProfileId: profile.id,
        taxType: returnTaxType,
        taxPeriodStart: returnRange.start,
        taxPeriodEnd: returnRange.end,
        currency: returnCurrency,
      });
      await taxReturns.refetch();
      setNotice(
        `Draft return generated for ${returnRange.start} to ${returnRange.end}.`,
      );
      setTab("Returns");
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function saveObligation() {
    if (!profile) return;
    setActionError(null);
    setNotice(null);
    if (!obPeriodStart || !obPeriodEnd || !obDueDate) {
      setActionError("Enter the period start, period end and due date.");
      return;
    }
    const taxable = obTaxable.trim();
    if (!/^\d+$/.test(taxable)) {
      setActionError("Taxable amount must be a whole number of cents.");
      return;
    }
    setSavingObligation(true);
    try {
      await createTaxObligation({
        zimraProfileId: profile.id,
        taxType: obTaxType,
        liablePartyType: "organization",
        taxPeriodStart: obPeriodStart,
        taxPeriodEnd: obPeriodEnd,
        taxableAmount: taxable,
        dueDate: obDueDate,
        currency: obCurrency,
      });
      await obligations.refetch();
      setNotice("Tax obligation recorded.");
      setObTaxable("");
      setObPeriodStart("");
      setObPeriodEnd("");
      setObDueDate("");
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setSavingObligation(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="ZIMRA Compliance" />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              profiles.refetch();
              obligations.refetch();
              taxReturns.refetch();
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
                  {profile
                    ? `${profile.taxpayerName ?? "Registered taxpayer"} · TIN ${profile.tin}`
                    : "Profile not registered"}
                </Text>
              </View>
              <Badge
                text={profile ? "Ready" : "Action needed"}
                tone={profile ? "green" : "amber"}
              />
            </View>

            <View className="mt-4 flex-row rounded-lg bg-[#E5E9F0] p-1">
              {TABS.map((t) => {
                const active = t === tab;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    className={`flex-1 rounded-lg px-2 py-2.5 ${active ? "bg-white" : ""}`}
                  >
                    <Text
                      className={`text-center text-[12px] font-semibold ${
                        active ? "text-[#0F2C4A]" : "text-[#6B7280]"
                      }`}
                    >
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {notice ? (
              <Text className="text-[13px] text-[#16A34A] mt-3">{notice}</Text>
            ) : null}
            {actionError ? (
              <Text className="text-[13px] text-[#DC2626] mt-3">
                {actionError}
              </Text>
            ) : null}

            {tab === "Overview" ? (
              <>
                {profile ? (
                  <Group className="mt-4">
                    <DetailRow label="TIN" value={profile.tin} />
                    <Divider />
                    <DetailRow
                      label="Taxpayer type"
                      value={profile.taxpayerType.replaceAll("_", " ")}
                    />
                    <Divider />
                    <DetailRow
                      label="VAT registered"
                      value={
                        profile.vatRegistered
                          ? profile.vatNumber
                            ? `Yes · ${profile.vatNumber}`
                            : "Yes"
                          : "No"
                      }
                    />
                    <Divider />
                    <DetailRow
                      label="Presumptive rental"
                      value={profile.presumptiveRentalRegistered ? "Yes" : "No"}
                    />
                    <Divider />
                    <DetailRow
                      label="Tax year end"
                      value={
                        MONTHS.find(
                          (m) => Number(m.value) === profile.taxYearEndMonth,
                        )?.label ?? String(profile.taxYearEndMonth)
                      }
                    />
                    <Divider />
                    <DetailRow
                      label="Registration status"
                      value={profile.registrationStatus}
                      last
                    />
                  </Group>
                ) : (
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
                    <Select
                      label="Tax year end month"
                      options={MONTHS}
                      value={taxYearEndMonth}
                      onChange={setTaxYearEndMonth}
                    />
                    <CheckRow
                      label="Registered for VAT"
                      checked={vatRegistered}
                      onToggle={() => setVatRegistered((v) => !v)}
                    />
                    {vatRegistered ? (
                      <Field
                        label="VAT number"
                        value={vatNumber}
                        onChangeText={setVatNumber}
                        autoCapitalize="characters"
                      />
                    ) : null}
                    <CheckRow
                      label="Registered for presumptive rental tax"
                      checked={presumptive}
                      onToggle={() => setPresumptive((v) => !v)}
                    />
                    <Field
                      label="ITF263 number (optional)"
                      value={itf263}
                      onChangeText={setItf263}
                      hint="Tax clearance certificate reference"
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
                )}

                {profile ? (
                  <>
                    <SectionTitle>Filing summary</SectionTitle>
                    <View className="flex-row gap-3">
                      <SummaryTile
                        label="Returns"
                        value={String(totals.count)}
                      />
                      <SummaryTile
                        label="Tax due"
                        value={money(centsToDollars(totals.due.toString()))}
                      />
                      <SummaryTile
                        label="Balance"
                        value={money(centsToDollars(totals.balance.toString()))}
                        tone={totals.balance > 0n ? "#DC2626" : "#16A34A"}
                      />
                    </View>

                    <SectionTitle>Documents</SectionTitle>
                    <Select
                      label="Document type"
                      options={DOCUMENT_TYPES}
                      value={documentType}
                      onChange={setDocumentType}
                      hint="Choose which ZIMRA document you're uploading."
                    />
                    <Btn
                      label={uploading ? "Uploading..." : "Upload document"}
                      onPress={pickAndUploadDocument}
                      disabled={uploading}
                      variant="outline"
                    />
                    {(profile.documents ?? []).length === 0 ? (
                      <Text className="text-[13px] text-[#6B7280] mt-3">
                        No documents uploaded yet. Upload ZIMRA-related
                        documents such as ITF263, VAT returns or correspondence.
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
                                  {doc.documentType
                                    ? `${DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType} · `
                                    : ""}
                                  {new Date(
                                    doc.uploadedAt,
                                  ).toLocaleDateString()}
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
                  </>
                ) : null}
              </>
            ) : null}

            {tab === "Returns" ? (
              <>
                {profile ? (
                  <View className="mt-4">
                    <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-3">
                      Generate a return
                    </Text>
                    <Select
                      label="Tax type"
                      options={TAX_TYPES}
                      value={returnTaxType}
                      onChange={setReturnTaxType}
                    />
                    <Field
                      label="Tax year"
                      value={returnYear}
                      onChangeText={setReturnYear}
                      keyboardType="number-pad"
                      maxLength={4}
                      hint={`Period ${returnRange.start} to ${returnRange.end}`}
                    />
                    <Select
                      label="Currency"
                      options={CURRENCIES}
                      value={returnCurrency}
                      onChange={setReturnCurrency}
                    />
                    <Btn
                      label={
                        generating ? "Generating..." : "Generate draft return"
                      }
                      onPress={runGenerateReturn}
                      disabled={generating}
                    />
                    <Text className="text-[11px] text-[#6B7280] mt-2 leading-4">
                      Drafts are computed from recorded rent charges and
                      approved expenses. Review before submitting to ZIMRA —
                      this is not a filing.
                    </Text>
                  </View>
                ) : (
                  <Text className="text-[13px] text-[#6B7280] mt-4">
                    Add your ZIMRA details first.
                  </Text>
                )}

                <SectionTitle>Tax returns</SectionTitle>
                {(taxReturns.data ?? []).length === 0 ? (
                  <Text className="text-[13px] text-[#6B7280]">
                    No tax returns generated yet.
                  </Text>
                ) : (
                  <Group>
                    {(taxReturns.data ?? []).map((taxReturn, i) => (
                      <View key={taxReturn.id}>
                        {i > 0 ? <Divider /> : null}
                        <View className="px-4 py-3">
                          <View className="flex-row items-center justify-between">
                            <View className="flex-1 pr-2">
                              <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                                {taxReturn.taxType.replaceAll("_", " ")}
                              </Text>
                              <Text className="text-[12px] text-[#6B7280] mt-1">
                                {taxReturn.taxPeriodStart} to{" "}
                                {taxReturn.taxPeriodEnd}
                              </Text>
                            </View>
                            <StatusText
                              text={taxReturn.status}
                              tone={statusTone(taxReturn.status)}
                            />
                          </View>
                          <View className="flex-row items-end justify-between mt-3 pt-3 border-t border-[#E5E9F0]">
                            <View>
                              <Text className="text-[11px] text-[#6B7280]">
                                Tax due
                              </Text>
                              <Text className="text-[16px] font-bold text-[#0F2C4A] mt-0.5">
                                {moneyIn(
                                  centsToDollars(taxReturn.taxDue),
                                  taxReturn.currency,
                                )}
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
                      </View>
                    ))}
                  </Group>
                )}
              </>
            ) : null}

            {tab === "Obligations" ? (
              <>
                {profile ? (
                  <View className="mt-4">
                    <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-3">
                      Record an obligation
                    </Text>
                    <Select
                      label="Tax type"
                      options={TAX_TYPES}
                      value={obTaxType}
                      onChange={setObTaxType}
                    />
                    <Field
                      label="Period start"
                      value={obPeriodStart}
                      onChangeText={setObPeriodStart}
                      placeholder="YYYY-MM-DD"
                      autoCapitalize="none"
                    />
                    <Field
                      label="Period end"
                      value={obPeriodEnd}
                      onChangeText={setObPeriodEnd}
                      placeholder="YYYY-MM-DD"
                      autoCapitalize="none"
                    />
                    <Field
                      label="Taxable amount (cents)"
                      value={obTaxable}
                      onChangeText={setObTaxable}
                      keyboardType="number-pad"
                      hint="Whole number of minor units, e.g. 150000 = $1,500.00"
                    />
                    <Field
                      label="Due date"
                      value={obDueDate}
                      onChangeText={setObDueDate}
                      placeholder="YYYY-MM-DD"
                      autoCapitalize="none"
                    />
                    <Select
                      label="Currency"
                      options={CURRENCIES}
                      value={obCurrency}
                      onChange={setObCurrency}
                    />
                    <Btn
                      label={
                        savingObligation ? "Saving..." : "Record obligation"
                      }
                      onPress={saveObligation}
                      disabled={savingObligation}
                    />
                    <Text className="text-[11px] text-[#6B7280] mt-2 leading-4">
                      The tax rate is taken from the rule in force on the period
                      end date.
                    </Text>
                  </View>
                ) : (
                  <Text className="text-[13px] text-[#6B7280] mt-4">
                    Add your ZIMRA details first.
                  </Text>
                )}

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
                            {obligation.taxPeriodStart} to{" "}
                            {obligation.taxPeriodEnd}
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
                            {moneyIn(
                              centsToDollars(obligation.taxAmount),
                              obligation.currency,
                            )}
                          </Text>
                        </View>
                        <Text className="text-[12px] text-[#6B7280]">
                          Due {obligation.dueDate}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            ) : null}

            {tab === "Rules" ? (
              <>
                <SectionTitle>Tax rules</SectionTitle>
                <Text className="text-[12px] text-[#6B7280] mb-3 leading-5">
                  Rates are versioned with effective dates so historical returns
                  stay accurate. Rules are maintained by platform
                  administrators.
                </Text>
                {rules.loading ? (
                  <LoadingView />
                ) : activeRules.length === 0 ? (
                  <Text className="text-[13px] text-[#6B7280]">
                    No tax rules published yet.
                  </Text>
                ) : (
                  <Group>
                    {activeRules.map((rule, i) => (
                      <View key={rule.id}>
                        {i > 0 ? <Divider /> : null}
                        <RuleRow rule={rule} />
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

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View className={`px-4 py-3 ${last ? "" : ""}`}>
      <View className="flex-row justify-between">
        <Text className="text-[13px] text-[#6B7280]">{label}</Text>
        <Text className="text-[13px] font-semibold text-[#0F2C4A] capitalize">
          {value}
        </Text>
      </View>
    </View>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className="mb-4 flex-row items-center"
      hitSlop={6}
    >
      <View
        className={`h-5 w-5 rounded border items-center justify-center ${
          checked
            ? "bg-[#F96B1F] border-[#F96B1F]"
            : "border-[#CBD5E1] bg-white"
        }`}
      >
        {checked ? (
          <Text className="text-[12px] font-bold text-white">✓</Text>
        ) : null}
      </View>
      <Text className="ml-2.5 text-[14px] text-[#0F2C4A]">{label}</Text>
    </Pressable>
  );
}

function SummaryTile({
  label,
  value,
  tone = "#0F2C4A",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View className="flex-1 rounded-lg border border-[#E5E9F0] bg-white px-3 py-3">
      <Text className="text-[11px] text-[#6B7280]">{label}</Text>
      <Text
        className="text-[15px] font-bold mt-1"
        style={{ color: tone }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function RuleRow({ rule }: { rule: TaxRule }) {
  return (
    <View className="px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[14px] font-semibold text-[#0F2C4A]">
          {rule.taxType.replaceAll("_", " ")}
        </Text>
        <Badge text={formatRate(rule.rate)} tone="navy" />
      </View>
      <Text className="text-[12px] text-[#6B7280] mt-1">
        {rule.calculationMethod.replaceAll("_", " ")} · v{rule.version}
      </Text>
      <Text className="text-[11px] text-[#6B7280] mt-1">
        {rule.effectiveFrom}
        {rule.effectiveTo ? ` → ${rule.effectiveTo}` : " → present"}
      </Text>
      <Text className="text-[11px] text-[#6B7280] mt-1">
        {rule.sourceName}
        {rule.sourceReference ? ` · ${rule.sourceReference}` : ""}
      </Text>
    </View>
  );
}
