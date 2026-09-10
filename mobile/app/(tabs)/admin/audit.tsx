import { Text, View } from "react-native";
import { Card, ErrorView, Header, LoadingView, Screen } from "@/components/ui";
import { getAuditLogs } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

function formatWhen(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default function AdminAudit() {
  const logs = useFetch(() => getAuditLogs({ limit: 100 }));
  const list = logs.data?.items ?? [];

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Audit log" />
      <Screen>
        {logs.loading ? (
          <LoadingView />
        ) : logs.error ? (
          <ErrorView message={logs.error} onRetry={logs.refetch} />
        ) : list.length === 0 ? (
          <Card>
            <Text className="text-[13px] text-[#6B7280]">
              No audit events recorded yet.
            </Text>
          </Card>
        ) : (
          list.map((log) => (
            <Card key={log.id} className="mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                    {log.action.replaceAll("_", " ")}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    {log.entityType}
                  </Text>
                </View>
                <Text className="text-[11px] text-[#6B7280]">
                  {formatWhen(log.createdAt)}
                </Text>
              </View>
              {log.changes ? (
                <View className="mt-2 border-t border-[#F1F5F9] pt-2">
                  <Text className="text-[12px] text-[#6B7280]">
                    {JSON.stringify(log.changes)}
                  </Text>
                </View>
              ) : null}
            </Card>
          ))
        )}
      </Screen>
    </View>
  );
}
