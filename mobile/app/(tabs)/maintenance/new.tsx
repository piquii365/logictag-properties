import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Btn, ErrorView, Field, Header, LoadingView, Pills, Screen } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { createMaintenanceRequest, getMyUnits } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { MaintenancePriority } from "@/lib/types";

const PRIORITIES: { label: string; value: MaintenancePriority }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

export default function NewRequest() {
  const { data: units, loading, error, refetch } = useFetch(getMyUnits);

  const [unitId, setUnitId] = useState<string | null>(null);
  const [pickUnit, setPickUnit] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("Medium");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedUnit = (units ?? []).find((u) => u.id === unitId) ?? null;

  async function handleSubmit() {
    setSubmitError(null);
    if (!unitId || !title.trim() || !description.trim()) {
      setSubmitError("Pick a unit and fill in the title and description.");
      return;
    }
    setSubmitting(true);
    try {
      const priorityValue = PRIORITIES.find((p) => p.label === priority)?.value ?? "medium";
      await createMaintenanceRequest({
        unitId,
        title: title.trim(),
        description: description.trim(),
        priority: priorityValue,
      });
      router.back();
    } catch (err) {
      setSubmitError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="New Request" />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView message={error} onRetry={refetch} />
        ) : (
          <>
            <Field
              label="Title"
              placeholder="e.g. Leaking kitchen tap"
              value={title}
              onChangeText={setTitle}
            />

            <Text className="text-[13px] text-[#6B7280] mb-1.5">Unit</Text>
            <Pressable
              onPress={() => setPickUnit((v) => !v)}
              className="flex-row items-center justify-between bg-white border border-[#E5E9F0] rounded-lg px-3.5 py-3.5 mb-4"
            >
              <Text className="text-[15px] text-[#0F2C4A]">
                {selectedUnit
                  ? `${selectedUnit.label} — ${selectedUnit.property?.name ?? ""}`
                  : "Select a unit"}
              </Text>
              <Ionicons
                name={pickUnit ? "chevron-up" : "chevron-down"}
                size={18}
                color="#9CA3AF"
              />
            </Pressable>
            {pickUnit ? (
              <View className="bg-white border border-[#E5E9F0] rounded-lg -mt-2 mb-4 overflow-hidden">
                {(units ?? []).length === 0 ? (
                  <Text className="text-[13px] text-[#6B7280] px-4 py-3">
                    No units available.
                  </Text>
                ) : (
                  (units ?? []).map((u) => (
                    <Pressable
                      key={u.id}
                      onPress={() => {
                        setUnitId(u.id);
                        setPickUnit(false);
                      }}
                      className="px-4 py-3 active:bg-[#F8FAFC]"
                    >
                      <Text className="text-[14px] text-[#0F2C4A]">
                        {u.label} — {u.property?.name ?? ""}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}

            <Text className="text-[13px] text-[#6B7280] mb-1.5">Priority</Text>
            <View className="mb-4">
              <Pills
                options={PRIORITIES.map((p) => p.label)}
                value={priority}
                onChange={setPriority}
              />
            </View>

            <Field
              label="Description"
              placeholder="Describe the issue"
              multiline
              numberOfLines={4}
              style={{ minHeight: 100, textAlignVertical: "top" }}
              value={description}
              onChangeText={setDescription}
            />

            {submitError ? (
              <Text className="text-[13px] text-[#DC2626] mb-4">
                {submitError}
              </Text>
            ) : null}

            <Btn
              label={submitting ? "Submitting..." : "Submit Request"}
              disabled={submitting}
              onPress={handleSubmit}
            />
          </>
        )}
      </Screen>
    </View>
  );
}
