import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import {
  Bar,
  Divider,
  ErrorView,
  Group,
  Header,
  LoadingView,
  Screen,
  SectionTitle,
  StatusText,
} from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import {
  getAiPredictions,
  getAiRecommendations,
  getFinancialSummary,
} from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

const LEVEL_TONE = { low: "green", medium: "amber", high: "red" } as const;

export default function Insights() {
  const summary = useFetch(getFinancialSummary);
  const predictions = useFetch(getAiPredictions);
  const recommendations = useFetch(getAiRecommendations);
  const loading =
    summary.loading || predictions.loading || recommendations.loading;
  const error = summary.error ?? predictions.error ?? recommendations.error;

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Insights" />
      <Screen>
        {loading ? (
          <LoadingView />
        ) : error ? (
          <ErrorView
            message={error}
            onRetry={() => {
              summary.refetch();
              predictions.refetch();
              recommendations.refetch();
            }}
          />
        ) : (
          <>
            <Text className="text-[13px] text-[#6B7280] mb-3">
              Read-only analysis from your recorded financial and operational
              data.
            </Text>
            <View className="border border-[#E5E9F0] rounded-lg bg-white">
              <View className="flex-row">
                <View className="flex-1 px-4 py-4">
                  <Text className="text-[12px] text-[#6B7280]">Collected</Text>
                  <Text className="text-[20px] font-bold text-[#16A34A] mt-1">
                    {money(centsToDollars(summary.data?.collectedMinor ?? "0"))}
                  </Text>
                </View>
                <View className="w-px bg-[#E5E9F0]" />
                <View className="flex-1 px-4 py-4">
                  <Text className="text-[12px] text-[#6B7280]">Net income</Text>
                  <Text className="text-[20px] font-bold text-[#0F2C4A] mt-1">
                    {money(centsToDollars(summary.data?.netIncomeMinor ?? "0"))}
                  </Text>
                </View>
              </View>
            </View>
            <View className="border border-[#E5E9F0] rounded-lg bg-white px-4 py-4 mt-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-[13px] text-[#6B7280]">
                  Collection rate
                </Text>
                <Text className="text-[22px] font-bold text-[#0F2C4A]">
                  {summary.data?.collectionRate == null
                    ? "—"
                    : `${summary.data.collectionRate}%`}
                </Text>
              </View>
              <Bar pct={summary.data?.collectionRate ?? 0} color="#16A34A" />
            </View>

            <SectionTitle>Signals</SectionTitle>
            <Group>
              {(predictions.data?.predictions ?? []).map(
                (prediction, index) => (
                  <View key={prediction.type}>
                    {index > 0 ? <Divider /> : null}
                    <View className="flex-row items-start px-4 py-3">
                      <Ionicons
                        name={
                          prediction.level === "high"
                            ? "warning"
                            : "analytics-outline"
                        }
                        size={20}
                        color={
                          prediction.level === "high" ? "#DC2626" : "#0F2C4A"
                        }
                      />
                      <View className="ml-3 flex-1">
                        <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                          {prediction.type.replaceAll("_", " ")}
                        </Text>
                        <Text className="text-[12px] text-[#6B7280] mt-1">
                          {prediction.reason}
                        </Text>
                        <StatusText
                          text={`${prediction.level} · ${Math.round(prediction.confidence * 100)}% confidence`}
                          tone={LEVEL_TONE[prediction.level]}
                        />
                      </View>
                    </View>
                  </View>
                ),
              )}
            </Group>

            <SectionTitle>Recommended actions</SectionTitle>
            <Group>
              {(recommendations.data?.recommendations ?? []).length === 0 ? (
                <View className="px-4 py-3">
                  <Text className="text-[13px] text-[#6B7280]">
                    No action is currently recommended.
                  </Text>
                </View>
              ) : null}
              {(recommendations.data?.recommendations ?? []).map(
                (item, index) => (
                  <View key={`${item.title}-${index}`}>
                    {index > 0 ? <Divider /> : null}
                    <View className="px-4 py-3">
                      <View className="flex-row items-center justify-between">
                        <Text className="flex-1 text-[14px] font-semibold text-[#0F2C4A]">
                          {item.title}
                        </Text>
                        <StatusText
                          text={item.priority}
                          tone={item.priority === "high" ? "red" : "amber"}
                        />
                      </View>
                      <Text className="text-[12px] text-[#6B7280] mt-1">
                        {item.reason}
                      </Text>
                    </View>
                  </View>
                ),
              )}
            </Group>
          </>
        )}
      </Screen>
    </View>
  );
}
