import { useState } from "react";
import { Text, View } from "react-native";
import {
  Badge,
  Btn,
  Card,
  ErrorView,
  Header,
  LoadingView,
  Screen,
  SearchBar,
  StatusText,
} from "@/components/ui";
import { apiErrorMessage } from "@/lib/api";
import { getUsers, setUserRole, setUserStatus } from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";
import type { AdminUser } from "@/lib/types";

const ROLE_OPTIONS = [
  "landlord",
  "property_manager",
  "staff",
  "tenant",
  "vendor",
  "admin",
] as const;

function roleTone(role: string): "green" | "amber" | "muted" | "navy" {
  if (role === "admin") return "amber";
  if (role === "landlord" || role === "property_manager") return "green";
  return "muted";
}

function statusTone(status: string): "green" | "red" | "muted" {
  if (status === "active") return "green";
  if (status === "suspended") return "red";
  return "muted";
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const users = useFetch(
    () =>
      getUsers({
        search: search.trim() || undefined,
        limit: 200,
      }),
    [search],
  );

  async function changeRole(user: AdminUser, role: string) {
    setBusyId(user.id);
    setError(null);
    try {
      await setUserRole(user.id, role);
      await users.refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    try {
      await setUserStatus(
        user.id,
        user.status === "active" ? "suspended" : "active",
      );
      await users.refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const list = users.data?.items ?? [];

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Users" />
      <Screen>
        <SearchBar
          placeholder="Search name or email"
          value={search}
          onChangeText={setSearch}
        />
        {error ? (
          <Text className="text-[13px] text-[#DC2626] mb-3">{error}</Text>
        ) : null}
        {users.loading ? (
          <LoadingView />
        ) : users.error ? (
          <ErrorView message={users.error} onRetry={users.refetch} />
        ) : list.length === 0 ? (
          <Card>
            <Text className="text-[13px] text-[#6B7280]">No users match.</Text>
          </Card>
        ) : (
          list.map((user) => (
            <Card key={user.id} className="mb-3">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-[15px] font-semibold text-[#0F2C4A]">
                    {user.name}
                  </Text>
                  <Text className="text-[12px] text-[#6B7280] mt-0.5">
                    {user.email}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-2">
                    <StatusText text={user.role} tone={roleTone(user.role)} />
                    <StatusText
                      text={user.status}
                      tone={statusTone(user.status)}
                    />
                  </View>
                </View>
                <Badge
                  text={busyId === user.id ? "…" : "Change role"}
                  tone="navy"
                />
              </View>

              <View className="flex-row flex-wrap gap-1.5 mt-3">
                {ROLE_OPTIONS.map((role) => (
                  <Btn
                    key={role}
                    label={role}
                    variant={user.role === role ? "dark" : "outline"}
                    className="px-2.5 py-1.5"
                    disabled={busyId === user.id}
                    onPress={() => changeRole(user, role)}
                  />
                ))}
              </View>

              <View className="mt-3 border-t border-[#F1F5F9] pt-3">
                <Btn
                  label={
                    user.status === "active"
                      ? "Suspend account"
                      : "Reactivate account"
                  }
                  variant={user.status === "active" ? "outline" : "primary"}
                  disabled={busyId === user.id}
                  onPress={() => toggleStatus(user)}
                />
              </View>
            </Card>
          ))
        )}
      </Screen>
    </View>
  );
}
