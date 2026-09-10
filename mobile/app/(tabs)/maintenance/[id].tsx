import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Badge,
  Btn,
  Divider,
  ErrorView,
  Group,
  Header,
  KV,
  LoadingView,
  Screen,
  SectionTitle,
} from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  assignMaintenanceVendor,
  getMaintenanceEvents,
  getMaintenanceRequest,
  getVendors,
  updateMaintenanceStatus,
} from "@/lib/queries";
import { isManagementRole, isTenant } from "@/lib/roles";
import { useFetch } from "@/lib/useFetch";
import type { MaintenancePriority, MaintenanceStatus } from "@/lib/types";

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  open: "Open",
  assigned: "Assigned",
  quoted: "Quoted",
  approved: "Approved",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  cancelled: "Cancelled",
};

const priorityTone = (p: MaintenancePriority) =>
  p === "high" || p === "emergency" ? "red" : p === "medium" ? "amber" : "muted";

export default function RequestDetail() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  // id can be momentarily undefined on the very first render — never
  // template that into a URL as the literal string "undefined".
  const request = useFetch(() => (id ? getMaintenanceRequest(id) : Promise.resolve(null)), [id]);
  const events = useFetch(() => (id ? getMaintenanceEvents(id) : Promise.resolve([])), [id]);
  const vendors = useFetch(getVendors);

  const isManagement = isManagementRole(user?.role);
  const isTenantUser = isTenant(user?.role);

  const [pickingVendor, setPickingVendor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function markResolved() {
    setBusy(true);
    setActionError(null);
    try {
      await updateMaintenanceStatus(id, "resolved");
      await Promise.all([request.refetch(), events.refetch()]);
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function assignVendor(vendorId: string) {
    setBusy(true);
    setActionError(null);
    setPickingVendor(false);
    try {
      await assignMaintenanceVendor(id, vendorId);
      await Promise.all([request.refetch(), events.refetch()]);
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const r = request.data;
  const approvedVendors = (vendors.data ?? []).filter((v) => v.status === "approved");
  const canResolve = r && r.status !== "resolved" && r.status !== "closed";

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Maintenance Request" right="ellipsis-horizontal" />
      <Screen>
        {request.loading ? (
          <LoadingView />
        ) : request.error || !r ? (
          <ErrorView
            message={request.error ?? "Request not found."}
            onRetry={request.refetch}
          />
        ) : (
          <>
            <View className="flex-row items-start justify-between mb-1">
              <Text className="text-[18px] font-bold text-[#0F2C4A] flex-1 pr-3">
                {r.title}
              </Text>
              <Badge text={r.priority} tone={priorityTone(r.priority)} />
            </View>
            <Text className="text-[13px] text-[#6B7280] leading-5 mb-5">
              {r.description}
            </Text>

            <Group>
              <View className="px-4">
                <KV
                  k="Status"
                  v={STATUS_LABEL[r.status]}
                  tone={
                    r.status === "resolved" || r.status === "closed"
                      ? "#16A34A"
                      : "#D97706"
                  }
                />
              </View>
              <Divider />
              <View className="px-4">
                <KV k="Unit" v={r.unit?.label ?? "—"} />
              </View>
              <Divider />
              <View className="px-4">
                <KV k="Property" v={r.unit?.property?.name ?? "—"} />
              </View>
              <Divider />
              <View className="px-4">
                <KV k="Reported by" v={r.reportedBy?.name ?? "—"} />
              </View>
              <Divider />
              <View className="px-4">
                <KV
                  k="Reported on"
                  v={new Date(r.openedAt).toLocaleDateString()}
                />
              </View>
              {r.vendor ? (
                <>
                  <Divider />
                  <View className="px-4">
                    <KV k="Vendor" v={r.vendor.name} />
                  </View>
                </>
              ) : null}
            </Group>

            <SectionTitle>Activity</SectionTitle>
            <Group>
              {(events.data ?? []).length === 0 ? (
                <View className="px-4 py-3">
                  <Text className="text-[13px] text-[#6B7280] leading-5">
                    {new Date(r.openedAt).toLocaleString()} — Request submitted
                    by {r.reportedBy?.name ?? "the reporter"}.
                  </Text>
                </View>
              ) : (
                (events.data ?? []).map((e, i) => (
                  <View key={e.id}>
                    {i > 0 ? <Divider /> : null}
                    <View className="px-4 py-3">
                      <Text className="text-[13px] text-[#6B7280] leading-5">
                        {new Date(e.createdAt).toLocaleString()} —{" "}
                        {e.type.replace(/_/g, " ")}
                        {e.notes ? `: ${e.notes}` : ""}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </Group>

            {actionError ? (
              <Text className="text-[13px] text-[#DC2626] mt-3">
                {actionError}
              </Text>
            ) : null}

            {pickingVendor ? (
              <Group className="mt-3">
                <View className="px-4 py-3">
                  <Text className="text-[13px] font-semibold text-[#0F2C4A] mb-2">
                    Choose a vendor
                  </Text>
                  {approvedVendors.length === 0 ? (
                    <Text className="text-[13px] text-[#6B7280]">
                      No approved vendors available yet.
                    </Text>
                  ) : (
                    approvedVendors.map((v) => (
                      <Pressable
                        key={v.id}
                        onPress={() => assignVendor(v.id)}
                        className="py-2.5 border-t border-[#E5E9F0] first:border-t-0"
                      >
                        <Text className="text-[14px] text-[#0F2C4A]">
                          {v.name}
                        </Text>
                        <Text className="text-[12px] text-[#6B7280]">
                          {v.city}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </Group>
            ) : null}

            {!isTenantUser ? (
              <View className="flex-row gap-3 mt-6">
                {isManagement ? (
                  <Btn
                    label="Assign Vendor"
                    variant="outline"
                    className="flex-1"
                    disabled={busy}
                    onPress={() => setPickingVendor((v) => !v)}
                  />
                ) : null}
                <Btn
                  label="Mark Resolved"
                  className={isManagement ? "flex-1" : "w-full"}
                  disabled={busy || !canResolve}
                  onPress={markResolved}
                />
              </View>
            ) : null}
          </>
        )}
      </Screen>
    </View>
  );
}
