import { router } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import {
  Badge,
  Btn,
  Card,
  Divider,
  ErrorView,
  Header,
  KV,
  LoadingView,
  Screen,
} from "@/components/ui";
import { centsToDollars, money } from "@/lib/data";
import {
  getLeases,
  getRentCharges,
  getTenants,
  getUtilityCharges,
} from "@/lib/queries";
import { useFetch } from "@/lib/useFetch";

const OUTSTANDING_STATUSES = new Set(["outstanding", "part_paid"]);

export default function PayRent() {
  const tenants = useFetch(getTenants);
  const leases = useFetch(getLeases);
  const rentCharges = useFetch(getRentCharges);
  const utilityCharges = useFetch(getUtilityCharges);

  const loading =
    tenants.loading ||
    leases.loading ||
    rentCharges.loading ||
    utilityCharges.loading;
  const error =
    tenants.error ?? leases.error ?? rentCharges.error ?? utilityCharges.error;

  const tenant = (tenants.data ?? [])[0] ?? null;
  const lease = useMemo(
    () =>
      [...(leases.data ?? [])].sort((a, b) =>
        a.startDate < b.startDate ? 1 : -1,
      )[0] ?? null,
    [leases.data],
  );

  const outstandingCharges = useMemo(
    () =>
      lease
        ? (rentCharges.data ?? [])
            .filter(
              (c) =>
                c.leaseId === lease.id && OUTSTANDING_STATUSES.has(c.status),
            )
            .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
        : [],
    [rentCharges.data, lease],
  );

  const outstandingUtilityCharges = utilityCharges.data ?? [];
  const utilityTotal = outstandingUtilityCharges
    .filter(
      (charge) =>
        charge.leaseId === lease?.id && OUTSTANDING_STATUSES.has(charge.status),
    )
    .reduce(
      (sum, charge) =>
        sum +
        centsToDollars(
          Number(charge.amountMinor) - Number(charge.allocatedMinor),
        ),
      0,
    );
  const rentTotal = outstandingCharges.reduce(
    (s, c) =>
      s + centsToDollars(Number(c.amountMinor) - Number(c.allocatedMinor)),
    0,
  );
  const total = rentTotal + utilityTotal;

  if (loading) {
    return (
      <View className="flex-1 bg-[#F4F6F9]">
        <Header title="Pay Rent" />
        <LoadingView />
      </View>
    );
  }

  if (error || !tenant || !lease) {
    return (
      <View className="flex-1 bg-[#F4F6F9]">
        <Header title="Pay Rent" />
        <ErrorView
          message={
            error ??
            "Your account isn't linked to a lease yet. Contact your property manager to get set up."
          }
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F4F6F9]">
      <Header title="Pay Rent" />
      <Screen>
        <Card>
          <Text className="text-[15px] font-semibold text-[#0F2C4A]">
            Lease {lease.reference}
          </Text>
          <Text className="text-[12px] text-[#6B7280] mt-0.5">
            {tenant.firstName} {tenant.lastName}
          </Text>
        </Card>

        <Card className="mt-3">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-[12px] text-[#6B7280] mb-1">
                Current Balance
              </Text>
              <Text
                className="text-[28px] font-bold"
                style={{ color: total ? "#DC2626" : "#16A34A" }}
              >
                {money(total)}
              </Text>
            </View>
            {total ? <Badge text="Overdue" tone="red" /> : null}
          </View>
          {outstandingCharges[0] ? (
            <>
              <Divider />
              <KV k="Next Due Date" v={outstandingCharges[0].dueDate} />
            </>
          ) : null}
        </Card>

        {outstandingCharges.length > 0 ? (
          <Card className="mt-3">
            <Text className="text-[15px] font-semibold text-[#0F2C4A] mb-1">
              Outstanding Charges
            </Text>
            {outstandingCharges.map((c) => (
              <KV
                key={c.id}
                k={`Rent — ${c.periodStart} to ${c.periodEnd}`}
                v={money(
                  centsToDollars(
                    Number(c.amountMinor) - Number(c.allocatedMinor),
                  ),
                )}
              />
            ))}
            {outstandingUtilityCharges
              .filter(
                (charge) =>
                  charge.leaseId === lease.id &&
                  OUTSTANDING_STATUSES.has(charge.status),
              )
              .map((charge) => (
                <KV
                  key={charge.id}
                  k="Utility charge"
                  v={money(
                    centsToDollars(
                      Number(charge.amountMinor) -
                        Number(charge.allocatedMinor),
                    ),
                  )}
                />
              ))}
            <Divider />
            <View className="flex-row items-center justify-between pt-3">
              <Text className="text-[14px] font-semibold text-[#0F2C4A]">
                Total
              </Text>
              <Text className="text-[16px] font-bold text-[#0F2C4A]">
                {money(total)}
              </Text>
            </View>
          </Card>
        ) : (
          <Card className="mt-3">
            <Text className="text-[14px] text-[#6B7280]">
              You&apos;re all caught up — nothing due.
            </Text>
          </Card>
        )}

        {total > 0 ? (
          <Btn
            label="Make Payment"
            className="mt-6"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/payments/method",
                params: {
                  amount: total.toFixed(2),
                  tenantId: tenant.id,
                  leaseId: lease.id,
                },
              })
            }
          />
        ) : null}
      </Screen>
    </View>
  );
}
