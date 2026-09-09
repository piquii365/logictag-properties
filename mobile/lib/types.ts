// Mirrors the server's entity shapes (server/src/**/entities/*.ts) as seen
// over the wire: uuid ids, camelCase fields, money as an integer-string
// count of minor units (cents) where the server bills that way.

export type OccupantUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  avatarUrl?: string | null;
  status: string;
};

export type Property = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  active: boolean;
  imageUrls: string[];
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type UnitStatus = "vacant" | "occupied" | "maintenance";

export type Unit = {
  id: string;
  label: string;
  floor: string | null;
  bedrooms: number;
  rent: string;
  status: UnitStatus;
  propertyId: string;
  property?: Property;
  tenantId: string | null;
  tenant: OccupantUser | null;
  createdAt: string;
  updatedAt: string;
};

export type MaintenancePriority = "low" | "medium" | "high" | "emergency";
export type MaintenanceStatus =
  | "open"
  | "assigned"
  | "quoted"
  | "approved"
  | "in_progress"
  | "resolved"
  | "closed"
  | "cancelled";

export type MaintenanceRequest = {
  id: string;
  reference: string;
  unitId: string;
  unit?: Unit;
  tenantId: string | null;
  reportedByUserId: string;
  reportedBy?: OccupantUser;
  assignedStaffId: string | null;
  vendorId: string | null;
  vendor?: { id: string; name: string } | null;
  acceptedQuoteId: string | null;
  title: string;
  description: string;
  categoryServiceId: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  openedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
};

export type TenantStatus = "active" | "former" | "blacklisted";

export type MaintenanceRequestEvent = {
  id: string;
  maintenanceRequestId: string;
  actorUserId: string | null;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  notes: string | null;
  createdAt: string;
};

export type Tenant = {
  id: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  status: TenantStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeaseStatus = "draft" | "active" | "expired" | "terminated";

export type Lease = {
  id: string;
  unitId: string;
  reference: string;
  startDate: string;
  endDate: string | null;
  rentAmountMinor: string;
  currency: string;
  status: LeaseStatus;
  createdAt: string;
};

export type ChargeStatus = "outstanding" | "part_paid" | "paid" | "voided";

export type RentCharge = {
  id: string;
  leaseId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amountMinor: string;
  currency: string;
  status: ChargeStatus;
  allocatedMinor: string;
  createdAt: string;
};

export type UtilityCharge = {
  id: string;
  utilityId: string;
  leaseId: string | null;
  unitId: string;
  tenantId: string | null;
  periodStart: string;
  periodEnd: string;
  amountMinor: string;
  currency: string;
  dueDate: string;
  status: string;
  allocatedMinor: string;
  createdAt: string;
};

export type PaymentMethod =
  "cash" | "bank_transfer" | "mobile_money" | "card" | "credit";
export type PaymentStatus =
  "pending" | "initiated" | "succeeded" | "failed" | "expired" | "reversed";

export type VendorStatus = "pending" | "approved" | "suspended" | "rejected";

export type Vendor = {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  city: string;
  status: VendorStatus;
  rating: string | null;
  ratingsCount: number;
  jobsCompleted: number;
};

export type BillingMethod = "metered" | "fixed" | "apportioned";

export type Utility = {
  id: string;
  propertyId: string;
  name: string;
  type: string;
  billingMethod: BillingMethod;
  isActive: boolean;
};

export type Payment = {
  id: string;
  merchantReference: string;
  tenantId: string;
  leaseId: string | null;
  amountMinor: string;
  currency: string;
  allocatedMinor: string;
  method: PaymentMethod;
  provider: string | null;
  providerReference: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  proofUrl: string | null;
};

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  amountMinor: string;
  pricePerUnitMinor: string | null;
  minimumUnits: number | null;
  maximumUnits: number | null;
  customPricing: boolean;
  currency: string;
  billingInterval: string;
  trialDays: number | null;
  isActive: boolean;
  /** JSON object of feature labels keyed by a slug, e.g. { units: "Up to 50 units" }. */
  features: Record<string, string>;
  notificationSettings: Record<string, unknown>;
};

export type SubscriptionStatus =
  "trialing" | "active" | "past_due" | "canceled" | "expired";

export type Subscription = {
  id: string;
  planId: string;
  status: SubscriptionStatus;
  managedUnits: number;
  agreedPricePerUnitMinor: string | null;
  startedAt: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  endedAt: string | null;
  trialEndsAt: string | null;
  provider: "pesepay" | null;
  providerReference: string | null;
  createdAt: string;
  /** Loaded by the server so the client can render plan-derived fields. */
  plan: SubscriptionPlan;
  /** Loaded for admins so they can see which user owns the subscription. */
  user?: AdminUser;
};

export type SubscriptionPaymentStatus = "pending" | "succeeded" | "failed";

export type SubscriptionPayment = {
  id: string;
  subscriptionId: string;
  amountMinor: string;
  currency: string;
  provider: string | null;
  providerReference: string | null;
  status: SubscriptionPaymentStatus;
  paidAt: string | null;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  eventType: string;
  subject: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

export type FinancialSummary = {
  period: { from: string; to: string };
  currency: string;
  grossChargesMinor: string;
  collectedMinor: string;
  expensesMinor: string;
  netIncomeMinor: string;
  outstandingMinor: string;
  collectionRate: number | null;
  source: string;
};

export type AiPrediction = {
  type: string;
  level: "low" | "medium" | "high";
  value: number;
  confidence: number;
  reason: string;
  evidence: unknown;
};

export type ComplianceProfile = {
  id: string;
  organizationId: string;
  tin: string;
  taxpayerName: string | null;
  taxpayerType: string;
  registrationStatus: string;
  vatRegistered: boolean;
  presumptiveRentalRegistered: boolean;
  taxYearEndMonth: number;
  documents: ComplianceDocument[];
};

export type TaxObligation = {
  id: string;
  taxType: string;
  taxPeriodStart: string;
  taxPeriodEnd: string;
  taxableAmount: string;
  taxRate: string;
  taxAmount: string;
  currency: string;
  dueDate: string;
  status: string;
};

// ── Admin console ────────────────────────────────────────────────

/** A user row as returned by the admin directory endpoint. */
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  avatarUrl: string | null;
};

export type UserListResponse = {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
};

export type UserListFilters = {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

/** A subscription payment with its subscription, plan and paying user loaded. */
export type SubscriptionPaymentWithRelations = SubscriptionPayment & {
  subscription: Subscription & {
    user: AdminUser;
  };
};

export type AuditLog = {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AuditLogListResponse = {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
};

export type SystemOverview = {
  counts: {
    users: number;
    properties: number;
    units: number;
    subscriptions: number;
    subscriptionPlans: number;
    subscriptionPayments: number;
    payments: number;
    auditLogs: number;
  };
  runtime: {
    node: string;
    platform: string;
    uptimeSeconds: number;
    memoryMb: number;
    env: string;
    now: string;
  };
};

// ── Compliance documents & tax returns ───────────────────────────

export type ComplianceDocument = {
  id: string;
  name: string;
  url: string;
  mime: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type TaxReturn = {
  id: string;
  organizationId: string;
  zimraProfileId: string;
  taxType: string;
  taxPeriodStart: string;
  taxPeriodEnd: string;
  status: string;
  grossRentalIncome: string;
  allowableDeductions: string;
  netIncome: string;
  taxDue: string;
  taxPaid: string;
  taxBalance: string;
  currency: string;
  generatedAt: string;
  lines?: TaxReturnLine[];
};

export type TaxReturnLine = {
  id: string;
  taxReturnId: string;
  lineType: string;
  description: string;
  amount: string;
  createdAt: string;
};
