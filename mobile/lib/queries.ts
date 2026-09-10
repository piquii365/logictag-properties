// Thin, typed wrappers around the real server endpoints. One file, since
// each function is a one-liner — split it up if a domain outgrows this.
import { api, BASE_URL } from "@/lib/api";
import type {
  Lease,
  LeaseStatus,
  RentFrequency,
  MaintenanceRequest,
  MaintenanceRequestEvent,
  MaintenancePriority,
  Payment,
  PaymentMethod,
  Property,
  RentCharge,
  Tenant,
  Unit,
  Utility,
  UtilityCharge,
  Vendor,
  Notification,
  NotificationRecipient,
  FinancialSummary,
  AiPrediction,
  ComplianceProfile,
  TaxObligation,
  Subscription,
  SubscriptionPlan,
  SubscriptionPayment,
  AdminUser,
  UserListResponse,
  UserListFilters,
  SubscriptionPaymentWithRelations,
  AuditLogListResponse,
  SystemOverview,
  TaxReturn,
  TaxRule,
  TenantIdentification,
} from "@/lib/types";
import type { SessionUser } from "@/lib/auth";

// ── Properties & units ───────────────────────────────────────────

export const getProperties = () => api<Property[]>("/properties");
export const getProperty = (id: string) => api<Property>(`/properties/${id}`);
export const getPropertyUnits = (propertyId: string) =>
  api<Unit[]>(`/properties/${propertyId}/units`);
/** Every unit the caller can see, across all their properties. */
export const getMyUnits = () => api<Unit[]>("/properties/units");
export const getUnit = (unitId: string) =>
  api<Unit>(`/properties/units/${unitId}`);
export const updateUnit = (
  unitId: string,
  dto: { label?: string; floor?: string; bedrooms?: number; rent?: number },
) => api<Unit>(`/properties/units/${unitId}`, { method: "PATCH", body: dto });

export const createProperty = (dto: {
  name: string;
  address: string;
  city?: string;
}) => api<Property>("/properties", { method: "POST", body: dto });
export const updateProperty = (
  id: string,
  dto: { name?: string; address?: string; city?: string },
) => api<Property>(`/properties/${id}`, { method: "PATCH", body: dto });
export const uploadPropertyImage = (
  id: string,
  file: { uri: string; name: string; type: string },
) => {
  const form = new FormData();
  form.append("file", file as unknown as Blob);
  return api<Property>(`/properties/${id}/images`, {
    method: "POST",
    body: form,
  });
};

export const createUnit = (
  propertyId: string,
  dto: { label: string; floor?: string; bedrooms?: number; rent?: number },
) =>
  api<Unit>(`/properties/${propertyId}/units`, { method: "POST", body: dto });

// ── Maintenance ───────────────────────────────────────────────────

export const getMaintenanceRequests = () =>
  api<MaintenanceRequest[]>("/maintenance-requests");
export const getMaintenanceRequest = (id: string) =>
  api<MaintenanceRequest>(`/maintenance-requests/${id}`);

export const createMaintenanceRequest = (dto: {
  unitId: string;
  title: string;
  description: string;
  priority: MaintenancePriority;
}) =>
  api<MaintenanceRequest>("/maintenance-requests", {
    method: "POST",
    body: dto,
  });

export const updateMaintenanceStatus = (
  id: string,
  status: MaintenanceRequest["status"],
  notes?: string,
) =>
  api<MaintenanceRequest>(`/maintenance-requests/${id}/status`, {
    method: "PATCH",
    body: { status, notes },
  });

export const assignMaintenanceVendor = (id: string, vendorId: string) =>
  api<MaintenanceRequest>(`/maintenance-requests/${id}/assign-vendor`, {
    method: "PATCH",
    body: { vendorId },
  });

export const getMaintenanceEvents = (id: string) =>
  api<MaintenanceRequestEvent[]>(`/maintenance-requests/${id}/events`);

// ── Vendors ───────────────────────────────────────────────────────

export const getVendors = () => api<Vendor[]>("/vendors");

// ── Utilities ─────────────────────────────────────────────────────

export const getUtilities = () => api<Utility[]>("/utilities");
export const createUtility = (dto: {
  propertyId: string;
  name: string;
  type: string;
  billingMethod: "metered" | "fixed" | "apportioned";
  apportionBasis?: string;
}) => api<Utility>("/utilities", { method: "POST", body: dto });

// ── Account ───────────────────────────────────────────────────────

export const updateProfile = (
  userId: string,
  dto: { name?: string; phone?: string },
) =>
  api<
    SessionUser & {
      phone: string | null;
      avatarUrl: string | null;
      status: string;
    }
  >(`/users/${userId}`, { method: "PATCH", body: dto });

export function uploadAvatar(
  userId: string,
  file: { uri: string; name: string; type: string },
) {
  const form = new FormData();
  // React Native's FormData accepts this {uri,name,type} shape in place of a
  // real Blob/File — it's how RN's networking layer streams a local file.
  form.append("file", file as unknown as Blob);
  return api<
    SessionUser & {
      phone: string | null;
      avatarUrl: string | null;
      status: string;
    }
  >(`/users/${userId}/avatar`, { method: "POST", body: form });
}

export const changePassword = (currentPassword: string, newPassword: string) =>
  api<{ message: string }>("/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });

export const requestEmailChange = (newEmail: string) =>
  api<{ message: string }>("/auth/email/request-change", {
    method: "POST",
    body: { newEmail },
  });

export const confirmEmailChange = (token: string) =>
  api<{ message: string; email: string }>("/auth/email/confirm-change", {
    method: "POST",
    skipAuth: true,
    body: { token },
  });

// ── Tenants ───────────────────────────────────────────────────────

export const getTenants = () => api<Tenant[]>("/tenants");
export const getTenantById = (id: string) => api<Tenant>(`/tenants/${id}`);
export const createTenant = (dto: {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  unitId?: string;
}) => api<Tenant>("/tenants", { method: "POST", body: dto });

// ── Leases & billing ──────────────────────────────────────────────

export const getLeases = () => api<Lease[]>("/leases");
export const createLease = (dto: {
  unitId: string;
  reference?: string;
  startDate: string;
  endDate?: string;
  rentAmountMinor: string;
  currency?: string;
  frequency: RentFrequency;
  rentDueDay?: number;
  depositMinor?: string;
  tenantId?: string;
}) => api<Lease>("/leases", { method: "POST", body: dto });
export const updateLease = (
  id: string,
  dto: Partial<{
    reference: string;
    startDate: string;
    endDate?: string;
    rentAmountMinor: string;
    currency?: string;
    frequency: RentFrequency;
    rentDueDay?: number;
    depositMinor?: string;
    status?: LeaseStatus;
    terminationReason?: string;
  }>,
) => api<Lease>(`/leases/${id}`, { method: "PATCH", body: dto });
export const activateLease = (id: string) =>
  api<Lease>(`/leases/${id}/activate`, { method: "PATCH" });
export const terminateLease = (id: string, reason?: string) =>
  api<Lease>(`/leases/${id}/terminate`, {
    method: "PATCH",
    body: { reason },
  });
export const getLeaseTenants = (leaseId: string) =>
  api<{ tenantId: string; isPrimary: boolean }[]>(`/leases/${leaseId}/tenants`);
export const addLeaseTenant = (
  leaseId: string,
  dto: { tenantId: string; isPrimary?: boolean },
) =>
  api<{ id: string; leaseId: string; tenantId: string; isPrimary: boolean }>(
    `/leases/${leaseId}/tenants`,
    { method: "POST", body: dto },
  );
export const getRentCharges = () => api<RentCharge[]>("/rent-charges");
export const getUtilityCharges = () => api<UtilityCharge[]>("/utility-charges");
export const createUtilityCharge = (dto: {
  tenantId: string;
  leaseId?: string;
  unitId: string;
  utilityId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amountMinor: string;
  currency?: string;
}) => api<UtilityCharge>("/utility-charges", { method: "POST", body: dto });
export const getPayments = () => api<Payment[]>("/payments");

// ── Internal subscriptions ─────────────────────────────────────

export const getSubscriptionPlans = () =>
  api<SubscriptionPlan[]>("/subscription-plans");
export const getSubscriptions = () => api<Subscription[]>("/subscriptions");
export const subscribeToPlan = (dto: {
  planId: string;
  provider?: "pesepay";
  agreedPricePerUnitMinor?: string;
}) => api<Subscription>("/subscriptions", { method: "POST", body: dto });
export const cancelSubscription = (id: string) =>
  api<Subscription>(`/subscriptions/${id}/cancel`, { method: "PATCH" });
export const resumeSubscription = (id: string) =>
  api<Subscription>(`/subscriptions/${id}/resume`, { method: "PATCH" });
export const changeSubscriptionPlan = (
  id: string,
  dto: {
    planId: string;
    agreedPricePerUnitMinor?: string;
    provider?: "pesepay";
  },
) =>
  api<Subscription>(`/subscriptions/${id}/change-plan`, {
    method: "PATCH",
    body: dto,
  });
export const getSubscriptionPayments = (id: string) =>
  api<SubscriptionPayment[]>(`/subscriptions/${id}/payments`);
export const recordSubscriptionPayment = (id: string) =>
  api<SubscriptionPayment>(`/subscriptions/${id}/payments`, { method: "POST" });
export const markSubscriptionPaymentSucceeded = (paymentId: string) =>
  api<SubscriptionPayment>(`/subscription-payments/${paymentId}/succeed`, {
    method: "PATCH",
  });
export const markSubscriptionPaymentFailed = (paymentId: string) =>
  api<SubscriptionPayment>(`/subscription-payments/${paymentId}/fail`, {
    method: "PATCH",
  });

// ── Admin: plans & subscriptions CRUD ──────────────────────────

export type SubscriptionPlanInput = {
  code: string;
  name: string;
  description?: string;
  amountMinor: string;
  pricePerUnitMinor?: string;
  minimumUnits?: number;
  maximumUnits?: number;
  customPricing?: boolean;
  isActive?: boolean;
  currency?: string;
  billingInterval: "monthly" | "yearly";
  trialDays?: number;
  features?: Record<string, unknown>;
  notificationSettings?: Record<string, unknown>;
};

export const createSubscriptionPlan = (dto: SubscriptionPlanInput) =>
  api<SubscriptionPlan>("/subscription-plans", { method: "POST", body: dto });
export const updateSubscriptionPlan = (
  id: string,
  dto: Partial<SubscriptionPlanInput>,
) =>
  api<SubscriptionPlan>(`/subscription-plans/${id}`, {
    method: "PATCH",
    body: dto,
  });
export const deleteSubscriptionPlan = (id: string) =>
  api<{ id: string }>(`/subscription-plans/${id}`, { method: "DELETE" });

export type AdminSubscriptionInput = {
  userId: string;
  planId: string;
  status?: Subscription["status"];
  startedAt?: string;
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  managedUnits?: number;
  agreedPricePerUnitMinor?: string;
  provider?: "pesepay";
};

export const adminCreateSubscription = (dto: AdminSubscriptionInput) =>
  api<Subscription>("/subscriptions/admin", { method: "POST", body: dto });
export const adminUpdateSubscription = (
  id: string,
  dto: Partial<AdminSubscriptionInput>,
) =>
  api<Subscription>(`/subscriptions/${id}`, { method: "PATCH", body: dto });
export const adminDeleteSubscription = (id: string) =>
  api<{ id: string }>(`/subscriptions/${id}`, { method: "DELETE" });

// ── Notifications & intelligence ───────────────────────────────

export const getNotifications = () => api<Notification[]>("/notifications");
export const markNotificationRead = (id: string) =>
  api<Notification>(`/notifications/${id}/read`, { method: "PATCH" });
/** Management: candidate tenant/vendor users they can message. */
export const getNotificationRecipients = () =>
  api<NotificationRecipient[]>("/notifications/recipients");
/** Management: send a notice to a chosen set of recipients. */
export const sendNotification = (dto: {
  userIds: string[];
  eventType: string;
  subject: string;
  body: string;
}) => api<Notification[]>("/notifications/send", { method: "POST", body: dto });
/** Tenant/vendor: message management. */
export const replyToManagement = (dto: {
  eventType: string;
  subject: string;
  body: string;
}) => api<Notification[]>("/notifications/reply", { method: "POST", body: dto });
export const getFinancialSummary = () =>
  api<FinancialSummary>("/ai/financial-summary");
export const getAiPredictions = () =>
  api<{ predictions: AiPrediction[] }>("/ai/predictions");
export const getAiRecommendations = () =>
  api<{
    recommendations: Array<{
      title: string;
      reason: string;
      priority: string;
      confidence: number;
    }>;
  }>("/ai/recommendations");

// ── Compliance ──────────────────────────────────────────────────

export const getComplianceProfiles = () =>
  api<ComplianceProfile[]>("/compliance/zimra/profiles");
export const createComplianceProfile = (dto: {
  tin: string;
  taxpayerName?: string;
  taxpayerType: string;
  registrationDate?: string;
  vatRegistered?: boolean;
  vatNumber?: string;
  presumptiveRentalRegistered?: boolean;
  taxYearEndMonth?: number;
}) =>
  api<ComplianceProfile>("/compliance/zimra/profiles", {
    method: "POST",
    body: dto,
  });
export const getTaxObligations = (profileId?: string) =>
  api<TaxObligation[]>("/compliance/tax-obligations", {
    params: profileId ? { profileId } : undefined,
  });

export const createPayment = (dto: {
  tenantId: string;
  leaseId?: string;
  amountMinor: string;
  method: PaymentMethod;
  provider?: string;
}) => api<Payment>("/payments", { method: "POST", body: dto });

export const updatePaymentStatus = (
  id: string,
  status: Payment["status"],
  failureReason?: string,
) =>
  api<Payment>(`/payments/${id}/status`, {
    method: "PATCH",
    body: { status, failureReason },
  });

/** A payment method offered by the PesePay gateway (e.g. EcoCash, InnBucks). */
export type PesepayMethod = {
  code: string;
  name: string;
  description?: string | null;
};

/** Payment methods the PesePay gateway currently supports. */
export const getPesepayMethods = () =>
  api<PesepayMethod[]>("/payments/pesepay/methods");

/** Kick off a real PesePay transaction for a payment. Returns the payment with
 * its `providerReference`/`pollUrl` populated so the client can poll status. */
export const initiatePesepay = (
  id: string,
  dto: { phoneNumber: string; paymentMethodCode: string },
) =>
  api<Payment>(`/payments/${id}/pesepay/initiate`, {
    method: "POST",
    body: dto,
  });

/** Poll the gateway for the latest status of an initiated payment. */
export const checkPesepayStatus = (id: string) =>
  api<Payment>(`/payments/${id}/pesepay/status`);

const createPaymentAllocation = (dto: {
  paymentId: string;
  allocatableType: "rent_charges" | "utility_charges";
  allocatableId: string;
  amountMinor: string;
}) => api("/payment-allocations", { method: "POST", body: dto });

/** Applies a succeeded payment against a lease's outstanding rent charges,
 * oldest due date first, splitting across charges if it covers more than one
 * and stopping once the payment amount runs out. Without this the charge
 * (and the payment's own `allocatedMinor`) never reflects that it was paid. */
export async function allocatePaymentToLease(
  paymentId: string,
  leaseId: string,
  amountMinor: string,
): Promise<void> {
  const charges = (await getRentCharges())
    .filter(
      (c) =>
        c.leaseId === leaseId &&
        (c.status === "outstanding" || c.status === "part_paid"),
    )
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  let remaining = BigInt(amountMinor);
  for (const charge of charges) {
    if (remaining <= 0n) break;
    const owed = BigInt(charge.amountMinor) - BigInt(charge.allocatedMinor);
    if (owed <= 0n) continue;
    const portion = remaining < owed ? remaining : owed;
    await createPaymentAllocation({
      paymentId,
      allocatableType: "rent_charges",
      allocatableId: charge.id,
      amountMinor: portion.toString(),
    });
    remaining -= portion;
  }
}

// ── Proof-of-payment upload ──────────────────────────────────────

/** Attach a proof-of-payment document (photo/PDF) to a payment. */
export function uploadPaymentProof(
  paymentId: string,
  file: { uri: string; name: string; type: string },
) {
  const form = new FormData();
  form.append("file", file as unknown as Blob);
  return api<Payment>(`/payments/${paymentId}/proof`, {
    method: "POST",
    body: form,
  });
}

// ── Compliance documents & tax returns ───────────────────────────

/** Upload a ZIMRA / compliance document to a profile. */
export function uploadComplianceDocument(
  profileId: string,
  file: { uri: string; name: string; type: string; documentType?: string },
) {
  const form = new FormData();
  form.append("file", file as unknown as Blob);
  if (file.documentType) form.append("documentType", file.documentType);
  return api<ComplianceProfile>(
    `/compliance/zimra/profiles/${profileId}/documents`,
    { method: "POST", body: form },
  );
}

/** Remove a previously uploaded compliance document. */
export const removeComplianceDocument = (
  profileId: string,
  documentId: string,
) =>
  api<ComplianceProfile>(
    `/compliance/zimra/profiles/${profileId}/documents/${documentId}`,
    { method: "DELETE" },
  );

export const getTaxReturns = (profileId?: string) =>
  api<TaxReturn[]>("/compliance/tax-returns", {
    params: profileId ? { profileId } : undefined,
  });

/** A single tax return with its computed lines. */
export const getTaxReturn = (id: string) =>
  api<TaxReturn>(`/compliance/tax-returns/${id}`);

/** Generate a draft tax return for a period from recorded income/expenses. */
export const generateTaxReturn = (dto: {
  zimraProfileId: string;
  taxType: string;
  taxPeriodStart: string;
  taxPeriodEnd: string;
  currency: string;
}) =>
  api<TaxReturn>("/compliance/tax-returns/generate", {
    method: "POST",
    body: dto,
  });

/** Record a tax obligation (what is owed, when, and under which rule). */
export const createTaxObligation = (dto: {
  zimraProfileId: string;
  taxType: string;
  liablePartyType: string;
  liablePartyId?: string;
  propertyId?: string;
  leaseId?: string;
  taxPeriodStart: string;
  taxPeriodEnd: string;
  taxableAmount: string;
  dueDate: string;
  currency: string;
}) =>
  api<TaxObligation>("/compliance/tax-obligations", {
    method: "POST",
    body: dto,
  });

/** Absolute URL of a tax return's PDF report (open in a browser / share). */
export const taxReturnPdfUrl = (id: string) =>
  `${BASE_URL}/compliance/tax-returns/${id}.pdf`;

// ── Tax rules (rates & effective windows) ────────────────────────

export const getTaxRules = (taxType?: string) =>
  api<TaxRule[]>("/compliance/tax-rules", {
    params: taxType ? { taxType } : undefined,
  });

/** The rule in force for a tax type on a given date. */
export const getTaxRuleForDate = (taxType: string, date: string) =>
  api<TaxRule>("/compliance/tax-rules/lookup", { params: { taxType, date } });

export const createTaxRule = (dto: {
  code: string;
  taxType: string;
  jurisdiction?: string;
  rate: string;
  calculationMethod: string;
  effectiveFrom: string;
  effectiveTo?: string;
  sourceName: string;
  sourceReference?: string;
  version?: number;
  active?: boolean;
}) => api<TaxRule>("/compliance/tax-rules", { method: "POST", body: dto });

// ── Tenant identification (ZIMRA / FIA) ──────────────────────────

export const getTenantIdentification = (tenantId: string) =>
  api<TenantIdentification | null>(
    `/compliance/tenants/${tenantId}/identification`,
  );

export const saveTenantIdentification = (
  tenantId: string,
  dto: {
    idType: string;
    idNumber: string;
    idIssueDate?: string;
    idExpiryDate?: string;
    issuingCountry?: string;
    documentId?: string;
  },
) =>
  api<TenantIdentification>(`/compliance/tenants/${tenantId}/identification`, {
    method: "POST",
    body: dto,
  });

export const verifyTenantIdentification = (tenantId: string) =>
  api<TenantIdentification>(
    `/compliance/tenants/${tenantId}/identification/verify`,
    { method: "PATCH" },
  );

// ── Admin console ────────────────────────────────────────────────

export const getUsers = (filters: UserListFilters = {}) =>
  api<UserListResponse>("/users", { params: filters });

export const setUserRole = (userId: string, role: string) =>
  api<AdminUser>(`/users/${userId}/role`, {
    method: "PATCH",
    body: { role },
  });

export const setUserStatus = (userId: string, status: string) =>
  api<AdminUser>(`/users/${userId}/status`, {
    method: "PATCH",
    body: { status },
  });

export const getAllSubscriptionPayments = () =>
  api<SubscriptionPaymentWithRelations[]>("/subscription-payments");

export const getAuditLogs = (filters: {
  userId?: string;
  action?: string;
  entityType?: string;
  page?: number;
  limit?: number;
} = {}) => api<AuditLogListResponse>("/audit-logs", { params: filters });

export const getSystemOverview = () => api<SystemOverview>("/system/overview");
