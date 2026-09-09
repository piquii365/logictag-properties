# LogicTag Properties - Implementation Plan

## From CRM to Property Operating System

**Version**: 1.0  
**Date**: 2026-09-08  
**Target**: Zimbabwe-focused Property Operations, Financial Management & Regulatory Compliance Platform

---

## Executive Summary

This plan transforms LogicTag Properties from a mobile CRM into a comprehensive property operating system across four phases:

1. **Phase 1: Financial Foundation** (12-16 weeks) - Core ledger, charges, payments, allocations
2. **Phase 2: Operational Foundation** (10-12 weeks) - Maintenance, utilities, documents, approvals
3. **Phase 3: Zimbabwe Compliance** (8-10 weeks) - ZIMRA tax engine, compliance checks, reporting
4. **Phase 4: Intelligence** (6-8 weeks) - AI, forecasting, analytics

**MVP Scope**: Phases 1 + 2 + 3 (core compliance for Zimbabwe market)

---

## PHASE 1: FINANCIAL FOUNDATION (12-16 weeks)

### Goals

- Transform CRM data into auditable financial records
- Enable accurate rent billing and payment tracking
- Establish financial ledger and reconciliation
- Build trustworthy owner statements

### 1.1 Data Model Changes

#### A. Rent Schedule (NEW)

```sql
CREATE TABLE rent_schedules (
  id UUID PRIMARY KEY,
  lease_id UUID NOT NULL,
  frequency VARCHAR(16),           -- monthly, quarterly, annually, weekly
  amount BIGINT,                   -- minor units (cents)
  currency CHAR(3),
  due_day SMALLINT,
  start_date DATE,
  end_date DATE,
  next_charge_date DATE,
  status VARCHAR(16),              -- active, inactive, paused
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### B. Enhanced Lease Model (MODIFY)

```sql
ALTER TABLE leases ADD COLUMN (
  lease_number VARCHAR(32) UNIQUE,
  deposit_amount BIGINT,
  deposit_currency CHAR(3),
  escalation_type VARCHAR(16),     -- none, percentage, fixed, cpi
  escalation_value DECIMAL(5,2),
  next_escalation_date DATE,
  late_payment_rule VARCHAR(16),   -- after_due_day, after_days_n
  terminated_at TIMESTAMP,
  termination_reason VARCHAR(255)
);
```

#### C. Unified Charge Model (MODIFY/EXTEND)

```sql
CREATE TABLE charges (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  property_id UUID NOT NULL,
  unit_id UUID NOT NULL,
  lease_id UUID,
  tenant_id UUID,
  charge_number VARCHAR(32) UNIQUE,

  type VARCHAR(32),                -- rent, water, electricity, internet, parking, service_charge, penalty, late_fee, other
  period_start DATE,
  period_end DATE,
  due_date DATE,

  subtotal BIGINT,                 -- before adjustments
  tax_amount BIGINT,
  total_amount BIGINT,
  currency CHAR(3),

  status VARCHAR(16),              -- outstanding, part_paid, paid, overdue, waived, cancelled

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Rename current rent_charges → legacy, create view
CREATE VIEW rent_charges AS
  SELECT * FROM charges WHERE type = 'RENT';
```

#### D. Charge Adjustments (NEW)

```sql
CREATE TABLE charge_adjustments (
  id UUID PRIMARY KEY,
  charge_id UUID NOT NULL,
  type VARCHAR(16),                -- credit, debit, tax, other
  amount BIGINT,
  reason VARCHAR(255),
  approved_by UUID,
  created_at TIMESTAMP
);
```

#### E. Enhanced Payment Model (MODIFY)

```sql
ALTER TABLE payments ADD COLUMN (
  payment_number VARCHAR(32) UNIQUE,
  payer_type VARCHAR(16),          -- tenant, landlord, admin, walk_in
  verified_by UUID,
  verified_at TIMESTAMP,
  status VARCHAR(16)               -- add more specific statuses
);
```

#### F. Payment Allocation (RENAME/EXPAND)

```sql
-- Rename payment_allocations if needed, expand to track:
ALTER TABLE payment_allocations ADD COLUMN (
  allocated_by UUID,
  allocation_date TIMESTAMP
);
```

#### G. Refund Model (NEW)

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY,
  payment_id UUID NOT NULL,
  amount BIGINT,
  currency CHAR(3),
  reason VARCHAR(255),
  status VARCHAR(16),              -- pending, approved, processed, reversed
  approved_by UUID,
  processed_at TIMESTAMP,
  created_at TIMESTAMP
);
```

#### H. Ledger Accounts (NEW)

```sql
CREATE TABLE ledger_accounts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  code VARCHAR(32) UNIQUE,
  name VARCHAR(255),
  type VARCHAR(32),                -- asset, liability, equity, income, expense
  account_type VARCHAR(32),        -- cash, bank, receivable, payable, rent_income, etc
  status VARCHAR(16),
  created_at TIMESTAMP
);
```

#### I. Ledger Transactions (NEW)

```sql
CREATE TABLE ledger_transactions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  transaction_number VARCHAR(32) UNIQUE,

  entity_type VARCHAR(32),         -- payment, expense, refund, adjustment, etc
  entity_id UUID,

  transaction_date DATE,
  description VARCHAR(255),

  created_by UUID,
  created_at TIMESTAMP
);
```

#### J. Ledger Entries (NEW)

```sql
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY,
  ledger_transaction_id UUID NOT NULL,
  account_id UUID NOT NULL,

  debit BIGINT DEFAULT 0,
  credit BIGINT DEFAULT 0,

  created_at TIMESTAMP
);
```

#### K. Expense Model (NEW)

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  property_id UUID,
  unit_id UUID,
  vendor_id UUID,

  category VARCHAR(32),            -- maintenance, repairs, security, cleaning, utilities, insurance, management_fee, local_authority, tax, legal, other
  description VARCHAR(255),

  amount BIGINT,
  currency CHAR(3),
  expense_date DATE,

  billable_to_tenant BOOLEAN,
  approved BOOLEAN,
  approved_by UUID,

  invoice_number VARCHAR(32),
  document_id UUID,

  status VARCHAR(16),              -- draft, submitted, approved, paid, reversed

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE expense_documents (
  id UUID PRIMARY KEY,
  expense_id UUID NOT NULL,
  document_id UUID NOT NULL
);

CREATE TABLE expense_approvals (
  id UUID PRIMARY KEY,
  expense_id UUID NOT NULL,
  approved_by UUID NOT NULL,
  approved_at TIMESTAMP,
  notes VARCHAR(255)
);
```

#### L. Owner Statement View (NEW)

```sql
-- Computed monthly
CREATE TABLE owner_statements (
  id UUID PRIMARY KEY,
  property_id UUID NOT NULL,
  owner_id UUID NOT NULL,

  statement_month DATE,

  opening_balance BIGINT,

  rent_collected BIGINT,
  other_income BIGINT,
  total_income BIGINT,

  maintenance_expenses BIGINT,
  utility_expenses BIGINT,
  management_fee BIGINT,
  tax_withheld BIGINT,
  other_expenses BIGINT,
  total_expenses BIGINT,

  net_owner_income BIGINT,
  closing_balance BIGINT,

  currency CHAR(3),

  generated_at TIMESTAMP,
  created_at TIMESTAMP
);
```

---

### 1.2 API Endpoints Required

#### Rent Schedules

```
POST   /leases/:leaseId/rent-schedule
GET    /leases/:leaseId/rent-schedule
PUT    /leases/:leaseId/rent-schedule
```

#### Charges

```
GET    /charges
GET    /charges?filter=property_id,unit_id,lease_id,status,date_range
GET    /charges/:id
POST   /charges/:id/adjustments
GET    /charges/aging-report
```

#### Payments

```
POST   /payments (enhanced with payer_type, verification)
PATCH  /payments/:id/allocate
PATCH  /payments/:id/verify
GET    /payments
GET    /payments/:id/allocations
```

#### Expenses

```
POST   /expenses
GET    /expenses
GET    /expenses/:id
PUT    /expenses/:id
POST   /expenses/:id/approve
POST   /expenses/:id/reverse
GET    /expenses/by-category
GET    /expenses/by-vendor
```

#### Owner Statements

```
GET    /properties/:propertyId/statements
GET    /properties/:propertyId/statements/:month
POST   /statements/generate (admin-triggered)
```

#### Ledger (Admin/Finance)

```
GET    /ledger/accounts
GET    /ledger/transactions
GET    /ledger/entries
POST   /ledger/reconciliation-check
```

---

### 1.3 Backend Services to Build/Modify

#### BillingService (NEW)

```typescript
-generateRentCharges(leaseId, from, to) -
  calculateChargeStatus(chargeId) -
  getAllOutstandingCharges(tenantId) -
  getChargesByProperty(propertyId);
```

#### PaymentService (ENHANCE)

```typescript
+verifyPayment(paymentId, by, reference) +
  allocatePayment(paymentId, allocationMap) +
  getReversal(paymentId, reason) +
  getPaymentAllocationHistory(paymentId) +
  reconcilePayments(propertyId, month);
```

#### ExpenseService (NEW)

```typescript
-createExpense(dto) -
  submitExpense(expenseId) -
  approveExpense(expenseId, approver) -
  recordPayment(expenseId) -
  reverseExpense(expenseId, reason) -
  getExpensesByCategory(propertyId, category) -
  getExpensesByVendor(vendorId, dateRange);
```

#### LedgerService (NEW)

```typescript
- createTransaction(entity_type, entity_id, entries[])
- recordPaymentTransaction(paymentId)
- recordExpenseTransaction(expenseId)
- recordRefundTransaction(refundId)
- getAccountBalance(accountId, date)
- getTransactionHistory(accountId, dateRange)
- reconcile(propertyId, month)
```

#### StatementService (NEW)

```typescript
-generateOwnerStatement(propertyId, month) -
  generateTenantStatement(tenantId, month) -
  getStatement(statementId) -
  getStatementComponents(statementId); // Drill-down details
```

#### ReconciliationService (NEW)

```typescript
-reconcileChargesVsPayments(propertyId, month) -
  reconcileBankTransactions(bankAccount, month) -
  reconcileLedger(month) -
  getReconciliationStatus(propertyId, month) -
  flagReconciliationException(exception);
```

---

### 1.4 Mobile/Web UI Changes

#### Landlord Dashboard (Modify)

```
HOME
├── Portfolio Summary (NEW)
│   ├── Total Monthly Income
│   ├── Outstanding Balance
│   ├── Occupancy Rate
│   └── Overdue Rent
│
├── Financial Summary (NEW)
│   ├── Rent Collected (this month)
│   ├── Expenses (this month)
│   ├── Net Income
│   └── 12-month trend
│
├── Action Items
│   ├── Overdue Rents (count)
│   ├── Approvals Pending (count)
│   ├── Maintenance Open (count)
│   └── Reconciliation Issues
│
└── Quick Links
```

#### Billing Section (NEW SCREENS)

```
BILLING
├── Rent Charges
│   ├── List (filter by property, status, date)
│   ├── Detail (show charge, allocations, adjustments)
│   └── Charge Overview (summary by unit)
│
├── Outstanding Balances
│   ├── Tenant Aging (0-30, 31-60, 61-90, 90+)
│   ├── Property Aging
│   ├── Drill-down to charge level
│   └── Export report
│
├── Expenses (NEW)
│   ├── List (filter by category, vendor, date, status)
│   ├── Create/Edit Expense
│   ├── Submit for Approval
│   ├── Expense Timeline
│   └── Expense by Category chart
│
└── Statements (NEW)
    ├── Owner Statement (monthly)
    ├── Tenant Statement
    ├── Statement Detail (drill-down each line item)
    ├── Export/Print
    └── Statement History
```

#### Payments Section (Enhance)

```
PAYMENTS
├── Record Payment (existing, enhanced)
│   ├── Auto-assign to outstanding charges
│   ├── Manual allocation option
│   ├── Verify payment (proof upload)
│   └── Success/confirmation
│
├── Payment History
│   ├── List (filter, search, export)
│   ├── Payment Detail (trace to allocations)
│   └── Payment Reversal (if applicable)
│
└── Reconciliation (NEW)
    ├── Monthly reconciliation status
    ├── Exceptions/mismatches
    └── Investigate/resolve
```

#### Property Manager Dashboard

```
COLLECTIONS
├── Outstanding by tenant (aging)
├── Follow-up actions
├── Payment reminders (send)
├── Collection report

OCCUPANCY
├── Vacant units
├── Lease expiries (30, 60, 90 days)
├── Move-out notices

MAINTENANCE
├── Open requests (count by priority)
├── Approved quotes pending work

COMPLIANCE (Phase 3 preview)
├── Missing tenant info
├── Documentation gaps
```

---

### 1.5 Tenant Statements Screen

```
STATEMENT
├── Current Rent Due
├── Outstanding Balance
├── Payment History (last 12 months)
│   └── Amount, date, method, reference
├── Charge Breakdown
│   ├── Rent: $X
│   ├── Utilities: $Y
│   ├── Other: $Z
│
└── Statement PDF (download)
```

---

### 1.6 Key Business Logic Changes

#### Rent Charge Generation

- Trigger on lease activation or schedule creation
- Generate for each billing period (monthly/quarterly/annually/weekly)
- Calculate based on rent_amount × frequency
- Apply escalation if configured
- Set due_date = start_date + due_day

#### Payment Processing

1. Record payment (amount, method, reference)
2. Verify payment (optional proof)
3. System calculates outstanding charges
4. Allocate to charges in order: oldest first
5. Record ledger transactions (Debit: Cash, Credit: Receivable)
6. Update charge status (Outstanding → Part-Paid → Paid)

#### Expense Tracking

1. Create expense (category, amount, vendor, date)
2. Submit for approval (if required)
3. Manager approves (optional)
4. Payment recorded
5. Ledger entries (Debit: Expense, Credit: Cash)
6. Calculate owner statement impact

#### Owner Statement

- Monthly aggregation
- Open Balance (from prior month)
- Add: Rent + Other Income
- Subtract: Expenses + Management Fee + Taxes + Utilities
- Result: Net Owner Income
- Closing Balance (available for disbursement)

---

### 1.7 Testing Strategy

#### Unit Tests

- Charge calculation logic
- Payment allocation algorithm
- Ledger entry balancing
- Statement aggregation
- Reconciliation logic

#### Integration Tests

- End-to-end payment flow
- Ledger reconciliation
- Expense workflow
- Statement generation

#### E2E Tests

- Tenant records payment
- Owner views statement
- Manager approves expense
- System reconciles

---

### 1.8 Success Metrics

✓ All charges traceable to lease and rent schedule
✓ All payments properly allocated
✓ Ledger balances (Assets = Liabilities + Equity)
✓ Owner statements match ledger
✓ Month-end reconciliation completes successfully
✓ Audit trail shows all financial operations
✓ No manual balance adjustments needed

---

## PHASE 2: OPERATIONAL FOUNDATION (10-12 weeks)

### Goals

- Complete property management workflow
- Enable utilities and maintenance tracking
- Support approvals and notifications
- Create document management system

### 2.1 Data Model Changes

#### A. Utilities System (ENHANCE)

```sql
CREATE TABLE utility_meters (
  id UUID PRIMARY KEY,
  unit_id UUID NOT NULL,
  meter_type VARCHAR(32),          -- water, electricity, gas, internet
  meter_number VARCHAR(64),
  installed_date DATE,
  status VARCHAR(16),
  created_at TIMESTAMP
);

CREATE TABLE utility_readings (
  id UUID PRIMARY KEY,
  meter_id UUID NOT NULL,
  previous_reading DECIMAL(10,2),
  current_reading DECIMAL(10,2),
  consumption DECIMAL(10,2),
  reading_date DATE,
  recorded_by UUID,
  created_at TIMESTAMP
);

CREATE TABLE utility_tariffs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  utility_type VARCHAR(32),
  effective_from DATE,
  effective_to DATE,
  fixed_charge BIGINT,
  unit_rate BIGINT,
  tax_rate DECIMAL(5,2),
  created_at TIMESTAMP
);

CREATE TABLE utility_bills (
  id UUID PRIMARY KEY,
  unit_id UUID NOT NULL,
  meter_id UUID,
  tariff_id UUID,

  billing_period_start DATE,
  billing_period_end DATE,

  reading_start DECIMAL(10,2),
  reading_end DECIMAL(10,2),
  consumption DECIMAL(10,2),

  fixed_charge BIGINT,
  consumption_charge BIGINT,
  tax_amount BIGINT,
  total_amount BIGINT,

  status VARCHAR(16),              -- draft, issued, paid, overdue
  created_at TIMESTAMP
);

CREATE TABLE utility_allocations (
  id UUID PRIMARY KEY,
  utility_bill_id UUID NOT NULL,
  tenant_id UUID,
  owner_id UUID,
  amount BIGINT,
  allocation_type VARCHAR(16),     -- tenant_pays, owner_pays, shared
  created_at TIMESTAMP
);
```

#### B. Maintenance System (ENHANCE)

```sql
-- Add to maintenance_requests
ALTER TABLE maintenance_requests ADD COLUMN (
  priority VARCHAR(16),            -- urgent, high, normal, low
  category VARCHAR(32),            -- plumbing, electrical, structural, cleaning, appliance, other

  quote_id UUID,
  quote_amount BIGINT,
  quote_currency CHAR(3),
  quote_approved BOOLEAN,
  quote_approved_at TIMESTAMP,

  completion_date DATE,
  completion_notes TEXT,

  estimated_cost BIGINT,
  actual_cost BIGINT
);

CREATE TABLE maintenance_quotes (
  id UUID PRIMARY KEY,
  maintenance_request_id UUID NOT NULL,
  vendor_id UUID NOT NULL,

  description TEXT,
  amount BIGINT,
  currency CHAR(3),
  valid_until DATE,

  status VARCHAR(16),              -- pending, approved, rejected, expired
  approved_by UUID,
  approved_at TIMESTAMP,

  created_at TIMESTAMP
);

CREATE TABLE maintenance_approvals (
  id UUID PRIMARY KEY,
  maintenance_request_id UUID NOT NULL,
  approved_by UUID NOT NULL,
  approved_at TIMESTAMP,
  notes VARCHAR(255)
);

CREATE TABLE maintenance_costs (
  id UUID PRIMARY KEY,
  maintenance_request_id UUID NOT NULL,
  expense_id UUID,

  description VARCHAR(255),
  cost BIGINT,
  currency CHAR(3),
  cost_date DATE,

  paid BOOLEAN,
  paid_at TIMESTAMP
);
```

#### C. Vendor System (ENHANCE)

```sql
ALTER TABLE vendors ADD COLUMN (
  business_name VARCHAR(255),
  registration_number VARCHAR(64),
  tin VARCHAR(32),

  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(32),

  address VARCHAR(255),

  service_category VARCHAR(32),    -- plumbing, electrical, security, cleaning, gardening, painting, etc

  bank_name VARCHAR(255),
  account_name VARCHAR(255),
  account_number VARCHAR(32),

  tax_clearance_status VARCHAR(16),
  tax_clearance_expiry DATE,

  status VARCHAR(16),              -- active, inactive, blacklisted

  created_at TIMESTAMP
);

CREATE TABLE vendor_documents (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL,
  document_type VARCHAR(32),       -- registration, tin, tax_clearance, quote, invoice, insurance
  document_id UUID NOT NULL
);

CREATE TABLE vendor_ratings (
  id UUID PRIMARY KEY,
  vendor_id UUID NOT NULL,
  maintenance_request_id UUID,

  quality_rating INT,              -- 1-5
  timeliness_rating INT,
  communication_rating INT,

  notes VARCHAR(255),
  rated_by UUID,
  rated_at TIMESTAMP
);
```

#### D. Document Management (NEW)

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,

  document_type VARCHAR(32),       -- lease_agreement, tenant_id, property_deed, invoice, receipt, quote, maintenance_report, etc

  file_name VARCHAR(255),
  file_path VARCHAR(512),
  mime_type VARCHAR(64),
  file_size BIGINT,

  uploader_id UUID NOT NULL,
  uploaded_at TIMESTAMP,

  current_version INT DEFAULT 1,
  status VARCHAR(16),              -- active, archived, deleted

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL,
  version_number INT,

  file_path VARCHAR(512),
  uploaded_by UUID,
  uploaded_at TIMESTAMP,

  change_description VARCHAR(255),

  created_at TIMESTAMP
);

CREATE TABLE document_links (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL,

  entity_type VARCHAR(32),         -- property, unit, lease, tenant, payment, expense, maintenance, vendor, tax_return, etc
  entity_id UUID NOT NULL,

  link_type VARCHAR(32),           -- primary, supporting, required, optional

  created_at TIMESTAMP
);

CREATE TABLE document_access (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL,
  user_id UUID NOT NULL,

  access_level VARCHAR(16),        -- view, edit, delete

  granted_at TIMESTAMP
);
```

#### E. Workflows & Approvals (NEW)

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,

  workflow_type VARCHAR(32),       -- expense_approval, maintenance_approval, lease_approval, quote_approval, payment_verification

  name VARCHAR(255),
  description TEXT,

  status VARCHAR(16),              -- active, inactive

  created_at TIMESTAMP
);

CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL,

  step_sequence INT,
  step_name VARCHAR(255),

  required_role VARCHAR(32),       -- manager, owner, finance, admin

  can_approve BOOLEAN,
  can_reject BOOLEAN,
  can_return_to_previous BOOLEAN,

  timeout_days INT,

  created_at TIMESTAMP
);

CREATE TABLE approvals (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL,
  workflow_step_id UUID NOT NULL,

  entity_type VARCHAR(32),         -- expense, maintenance_request, lease, quote, payment
  entity_id UUID NOT NULL,

  assigned_to UUID NOT NULL,
  assigned_at TIMESTAMP,

  status VARCHAR(16),              -- pending, approved, rejected, returned

  action_by UUID,
  action_at TIMESTAMP,
  action_notes TEXT,

  created_at TIMESTAMP
);
```

#### F. Notifications (NEW)

```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,

  event_type VARCHAR(32),          -- rent_due, rent_overdue, payment_received, maintenance_assigned, quote_approval_required, etc

  template_name VARCHAR(255),
  subject_template TEXT,
  body_template TEXT,

  supports_email BOOLEAN,
  supports_sms BOOLEAN,
  supports_push BOOLEAN,

  created_at TIMESTAMP
);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,

  event_type VARCHAR(32),

  receive_email BOOLEAN,
  receive_sms BOOLEAN,
  receive_push BOOLEAN,

  frequency VARCHAR(16),           -- immediate, daily, weekly, never

  created_at TIMESTAMP
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,

  event_type VARCHAR(32),
  template_id UUID,

  entity_type VARCHAR(32),
  entity_id UUID,

  subject VARCHAR(255),
  body TEXT,

  sent_via VARCHAR(32),            -- email, sms, push

  read BOOLEAN,
  read_at TIMESTAMP,

  sent_at TIMESTAMP,
  created_at TIMESTAMP
);

CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY,
  notification_id UUID NOT NULL,

  delivery_method VARCHAR(32),     -- email, sms, push
  delivery_address VARCHAR(255),

  status VARCHAR(16),              -- sent, failed, bounced, opened, clicked

  error_message TEXT,

  sent_at TIMESTAMP,
  delivered_at TIMESTAMP
);
```

---

### 2.2 API Endpoints

#### Utilities

```
GET    /units/:unitId/utilities
GET    /units/:unitId/utilities/:meterId/readings
POST   /units/:unitId/utilities/:meterId/readings
GET    /utilities/tariffs
POST   /utilities/bills/generate
GET    /utilities/bills
```

#### Maintenance

```
POST   /maintenance-requests/:id/quote
PATCH  /maintenance-requests/:id/approve-quote
GET    /maintenance-requests/:id/costs
POST   /maintenance-requests/:id/complete
GET    /maintenance/by-priority
GET    /maintenance/by-vendor
GET    /maintenance/analytics
```

#### Vendors

```
POST   /vendors
GET    /vendors
PUT    /vendors/:id
POST   /vendors/:id/documents
GET    /vendors/:id/ratings
GET    /vendors/:id/performance
```

#### Documents

```
POST   /documents
GET    /documents
GET    /documents/:id/versions
POST   /documents/:id/share
GET    /documents/:id/access
```

#### Workflows

```
GET    /workflows
GET    /workflows/:id/steps
POST   /approvals/:id/approve
POST   /approvals/:id/reject
GET    /approvals/pending
```

#### Notifications

```
GET    /notifications
PATCH  /notifications/:id/read
PUT    /users/:id/notification-preferences
POST   /notifications/test-send
```

---

### 2.3 Backend Services

#### UtilityService (ENHANCE)

```typescript
-recordMeterReading(meterId, reading) -
  generateUtilityBill(unitId, period) -
  allocateUtilityBill(billId, allocations) -
  getConsumption(meterId, dateRange) -
  getUtilityTrend(unitId, months);
```

#### MaintenanceService (ENHANCE)

```typescript
+getMaintenanceByPriority(propertyId) +
  requestQuote(requestId, vendorId) +
  approveQuote(quoteId, approver) +
  rejectQuote(quoteId, reason) +
  completeRequest(requestId, cost, notes) +
  getMaintenanceAnalytics(propertyId, dateRange) +
  predictMaintenanceCosts(propertyId);
```

#### VendorService (NEW)

```typescript
-createVendor(dto) -
  getRatingAverage(vendorId) -
  getPerformanceMetrics(vendorId) -
  suspendVendor(vendorId, reason) -
  getVendorsByCategory(category);
```

#### DocumentService (NEW)

```typescript
-uploadDocument(file, type, entity) -
  getDocument(documentId) -
  createVersion(documentId, file) -
  shareDocument(documentId, userId) -
  deleteDocument(documentId) -
  archiveDocument(documentId);
```

#### WorkflowService (NEW)

```typescript
-createApproval(entity, workflow) -
  getNextApprover(approvalId) -
  approve(approvalId, approver, notes) -
  reject(approvalId, approver, notes) -
  getApprovalStatus(entityId) -
  escalateIfTimeout(approvalId);
```

#### NotificationService (NEW)

```typescript
-sendNotification(event, userId, data) -
  queueNotification(notification) -
  processQueue() -
  markAsRead(notificationId) -
  updatePreferences(userId, preferences) -
  testSend(userId, templateId);
```

---

### 2.4 Mobile/Web UI Screens

#### Utilities Section (NEW)

```
UTILITIES
├── Meter Readings
│   ├── List all meters
│   ├── Record reading
│   ├── Reading history
│   └── Consumption chart
│
├── Bills
│   ├── Current bills
│   ├── Bill detail
│   └── Payment history
│
└── Allocation
    ├── View allocation rules
    ├── Tenant vs Owner split
    └── Adjustment
```

#### Maintenance Enhanced

```
MAINTENANCE
├── Requests
│   ├── List (filter by status, priority, assignee)
│   ├── Request detail (include costs)
│   ├── Timeline of events
│   └── Documents attached
│
├── Quotes (NEW)
│   ├── Vendor quotes list
│   ├── Quote comparison
│   ├── Approve/reject
│   └── Approval history
│
├── Costs (NEW)
│   ├── Expense tracking
│   ├── Cost vs budget
│   ├── Cost timeline
│   └── Export report
│
└── Vendor Performance (NEW)
    ├── Rating distribution
    ├── Response time
    ├── Quality metrics
    └── Cost efficiency
```

#### Vendors Section (NEW)

```
VENDORS
├── Directory
│   ├── List (filter by service category, rating, status)
│   ├── Vendor detail
│   ├── Contact info
│   ├── Ratings and reviews
│   └── Performance metrics
│
├── Documents
│   ├── Upload registration
│   ├── TIN certificate
│   ├── Tax clearance
│   └── Insurance
│
└── Analytics
    ├── Cost by vendor
    ├── Quality trends
    ├── Responsiveness
    └── Maintenance history
```

#### Documents Section (NEW)

```
DOCUMENTS
├── Upload
│   ├── Select document type
│   ├── Link to entity (property, lease, tenant, etc)
│   ├── Upload file
│   └── Tag/organize
│
├── Library
│   ├── List documents (filter by type, entity, date)
│   ├── Document preview
│   ├── Version history
│   ├── Download
│   └── Share
│
└── Management
    ├── Assign access
    ├── Archive
    ├── Delete (soft)
    └── Audit trail
```

#### Approvals Hub (NEW)

```
APPROVALS
├── Pending Actions
│   ├── Expenses awaiting approval
│   ├── Maintenance quotes pending
│   ├── Payment verifications
│   └── Lease approvals
│
├── Review Item
│   ├── Full detail
│   ├── Supporting documents
│   ├── Audit trail
│   ├── Approve button
│   ├── Reject button (with reason)
│   └── Request more info
│
├── History
│   └── Approved/rejected items with notes
│
└── Notifications (integrated)
```

#### Notifications Center (NEW)

```
NOTIFICATIONS
├── Inbox
│   ├── All notifications (chronological)
│   ├── Filter by type
│   ├── Mark as read
│   ├── Action buttons (if applicable)
│   └── Notification detail
│
├── Preferences
│   ├── Event types (toggle on/off)
│   ├── Channels (email, SMS, push)
│   ├── Frequency (immediate, daily, weekly)
│   └── Quiet hours
│
└── History
    ├── Archive of all notifications
    ├── Search/filter
    └── Manage dismissed
```

---

### 2.5 Business Logic

#### Utility Billing

- Read meter at period end
- Calculate consumption (current - previous)
- Apply tariff (fixed + variable × consumption)
- Calculate tax (if applicable)
- Generate bill for tenant/owner/split

#### Maintenance Workflow

1. Tenant submits request
2. Manager reviews and assigns to vendor
3. Vendor provides quote(s)
4. Manager approves quote
5. Work performed
6. Completion recorded
7. Invoice matched to quote
8. Payment processed
9. Expense recorded
10. Owner statement reflects cost

#### Vendor Performance

- Track response time to inquiries
- Quality ratings (1-5 scale)
- Cost competitiveness
- Timeliness of work completion
- Identify top/problem vendors

#### Document Versioning

- Original uploaded
- Subsequent uploads create versions
- Maintain version history
- Show who changed what when
- Revert to prior version if needed

---

### 2.6 Success Metrics

✓ All utilities metered and billed
✓ All maintenance tracked from request to closure
✓ All vendors documented and rated
✓ All approval workflows complete without manual override
✓ Notification delivery 95%+ success rate
✓ Document uploads and retrieval < 2 seconds
✓ No missing or orphaned documents

---

## PHASE 3: ZIMBABWE COMPLIANCE (8-10 weeks)

### Goals

- ZIMRA tax readiness
- Tenant identification verification
- Tax obligation tracking and reporting
- Compliance dashboard
- Support for ITF263 withholding certificates

### 3.1 Data Model Changes

#### A. ZIMRA Profile (NEW)

```sql
CREATE TABLE zimra_profiles (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,

  tin VARCHAR(32) NOT NULL UNIQUE,
  taxpayer_name VARCHAR(255),
  taxpayer_type VARCHAR(32),       -- individual, company, trust, other

  registration_status VARCHAR(16),
  registration_date DATE,

  vat_registered BOOLEAN,
  vat_number VARCHAR(32),

  presumptive_rental_registered BOOLEAN,

  itf263_number VARCHAR(32),
  itf263_issue_date DATE,
  itf263_expiry_date DATE,

  tax_year_end_month INT,          -- 12 for December, etc

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE zimra_profile_documents (
  id UUID PRIMARY KEY,
  zimra_profile_id UUID NOT NULL,
  document_type VARCHAR(32),       -- registration, tin, vat_cert, itf263, etc
  document_id UUID NOT NULL
);
```

#### B. Property Tax Classification (NEW)

```sql
ALTER TABLE properties ADD COLUMN (
  tax_classification VARCHAR(32),  -- primary_residence, rental_property, investment, mixed, other
  annual_rental_value BIGINT,      -- estimated or actual
  presumptive_tax_registered BOOLEAN,

  -- Ownership for tax purposes
  tax_owner_id UUID,               -- if different from owner_id (trust, company, etc)
  ownership_structure VARCHAR(32), -- individual, company, trust, partnership, other

  cgt_cost_base BIGINT,
  cgt_currency CHAR(3),
  acquisition_date_for_tax DATE
);
```

#### C. Tenant Identification (NEW)

```sql
CREATE TABLE tenant_identifications (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,

  id_type VARCHAR(32),             -- passport, national_id, driving_license, company_reg, other
  id_number VARCHAR(64),
  id_issue_date DATE,
  id_expiry_date DATE,

  id_issuing_country VARCHAR(2),

  document_id UUID,
  verified BOOLEAN,
  verified_by UUID,
  verified_at TIMESTAMP,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE tenant_tin (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE,

  tin VARCHAR(32),
  registered_name VARCHAR(255),

  verified BOOLEAN,
  verified_by UUID,
  verified_at TIMESTAMP,

  created_at TIMESTAMP
);
```

#### D. Tax Rules (NEW)

```sql
CREATE TABLE tax_rules (
  id UUID PRIMARY KEY,

  code VARCHAR(32) UNIQUE,         -- PRIT_2025, VAT_2025, WITHHOLDING_2025, etc
  tax_type VARCHAR(32),            -- presumptive_rental, vat, withholding, cgt, other
  jurisdiction VARCHAR(16),        -- ZW, etc

  rate DECIMAL(5,2),

  calculation_method VARCHAR(64),  -- GROSS_RENTAL × RATE, TAX_AMOUNT, etc

  effective_from DATE,
  effective_to DATE,

  source_name VARCHAR(255),        -- "ZIMRA Statutory Instrument 2025/...", etc
  source_reference VARCHAR(255),

  version INT,
  active BOOLEAN,

  created_at TIMESTAMP
);
```

#### E. Tax Obligations (NEW)

```sql
CREATE TABLE tax_obligations (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  zimra_profile_id UUID NOT NULL,

  tax_type VARCHAR(32),            -- presumptive_rental, vat, withholding, cgt, etc
  liable_party_type VARCHAR(32),   -- landlord, tenant, both
  liable_party_id UUID,            -- landlord_id, tenant_id, etc

  property_id UUID,
  unit_id UUID,
  lease_id UUID,

  tax_period_start DATE,
  tax_period_end DATE,

  taxable_amount BIGINT,
  tax_rate DECIMAL(5,2),
  tax_amount BIGINT,

  currency CHAR(3),

  due_date DATE,

  status VARCHAR(16),              -- pending, due, overdue, paid, waived, disputed

  rule_version_id UUID,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### F. Tax Returns (NEW)

```sql
CREATE TABLE tax_returns (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  zimra_profile_id UUID NOT NULL,

  tax_type VARCHAR(32),
  tax_period_start DATE,
  tax_period_end DATE,
  tax_year INT,

  status VARCHAR(16),              -- draft, submitted, confirmed, assessed, disputed, paid

  gross_rental_income BIGINT,
  allowable_deductions BIGINT,
  net_income BIGINT,

  tax_due BIGINT,
  tax_paid BIGINT,
  tax_balance BIGINT,

  currency CHAR(3),

  generated_at TIMESTAMP,
  submitted_at TIMESTAMP,
  submitted_reference VARCHAR(64),

  verified BOOLEAN,
  verified_by UUID,
  verified_at TIMESTAMP,

  return_document_id UUID,

  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE tax_return_lines (
  id UUID PRIMARY KEY,
  tax_return_id UUID NOT NULL,

  line_type VARCHAR(32),           -- property_rental, utility_income, other_income, depreciation, interest, maintenance, etc

  description VARCHAR(255),
  amount BIGINT,

  entity_type VARCHAR(32),         -- property, lease, unit, tenant, payment, expense, etc
  entity_id UUID,

  created_at TIMESTAMP
);
```

#### G. Tax Payments (NEW)

```sql
CREATE TABLE tax_payments (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,

  tax_type VARCHAR(32),
  tax_period_start DATE,
  tax_period_end DATE,

  payment_reference VARCHAR(64),   -- provided by ZIMRA

  amount_paid BIGINT,
  currency CHAR(3),

  payment_method VARCHAR(32),      -- bank_transfer, cash, check, etc

  paid_date DATE,

  tax_obligation_id UUID,
  payment_id UUID,

  receipt_document_id UUID,

  status VARCHAR(16),              -- submitted, confirmed, cleared, disputed

  created_at TIMESTAMP
);
```

#### H. ITF263 Certificates (NEW)

```sql
CREATE TABLE itf263_certificates (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,

  certificate_number VARCHAR(32) UNIQUE,
  issue_date DATE,
  expiry_date DATE,

  document_id UUID,

  withholding_rate DECIMAL(5,2),

  status VARCHAR(16),              -- valid, expired, cancelled

  created_at TIMESTAMP
);
```

#### I. Compliance Checks (NEW)

```sql
CREATE TABLE compliance_checks (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,

  check_type VARCHAR(32),          -- tax_profile, property_info, tenant_identification, rental_records, payment_reconciliation, documentation

  check_date DATE,

  status VARCHAR(16),              -- pass, fail, warning, pending

  issues_count INT,
  issues_resolved INT,

  result_summary TEXT,

  created_at TIMESTAMP
);

CREATE TABLE compliance_issues (
  id UUID PRIMARY KEY,
  compliance_check_id UUID NOT NULL,
  organization_id UUID NOT NULL,

  issue_type VARCHAR(32),          -- missing_identification, missing_property_info, missing_lease_document, missing_payment_proof, inconsistent_data, unpaid_tax, etc

  severity VARCHAR(16),            -- critical, warning, info

  entity_type VARCHAR(32),         -- tenant, property, lease, payment, tax_return, etc
  entity_id UUID,

  description VARCHAR(255),

  impact VARCHAR(255),             -- "ZIMRA return cannot be filed", "ITF263 invalid", etc

  remediation_steps TEXT,

  resolved BOOLEAN,
  resolved_at TIMESTAMP,
  resolved_by UUID,

  created_at TIMESTAMP
);

CREATE TABLE compliance_evidence (
  id UUID PRIMARY KEY,
  compliance_issue_id UUID NOT NULL,

  evidence_type VARCHAR(32),       -- document, transaction, payment_proof, communication, etc

  document_id UUID,

  created_at TIMESTAMP
);
```

#### J. Compliance Audit Pack (NEW)

```sql
CREATE TABLE compliance_audit_packs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,

  tax_period_start DATE,
  tax_period_end DATE,

  prepared_at TIMESTAMP,
  prepared_by UUID,

  status VARCHAR(16),              -- draft, ready, submitted, reviewed

  generation_log TEXT,

  created_at TIMESTAMP
);

CREATE TABLE audit_pack_documents (
  id UUID PRIMARY KEY,
  audit_pack_id UUID NOT NULL,

  document_category VARCHAR(32),   -- tax_return, tax_payment_proof, property_schedule, tenant_schedule, lease_documents, payment_records, expense_documents, property_valuation

  document_id UUID NOT NULL,

  description VARCHAR(255),

  required BOOLEAN,
  included BOOLEAN,

  created_at TIMESTAMP
);
```

---

### 3.2 API Endpoints

#### ZIMRA Profiles

```
POST   /zimra/profiles
GET    /zimra/profiles
PUT    /zimra/profiles/:id
GET    /zimra/profiles/:id/status
POST   /zimra/profiles/:id/documents
```

#### Properties Tax Classification

```
PATCH  /properties/:id/tax-classification
GET    /properties/:id/tax-info
```

#### Tenant Identification

```
POST   /tenants/:id/identification
GET    /tenants/:id/identification
POST   /tenants/:id/tin
PATCH  /tenants/:id/identification/verify
```

#### Tax Rules

```
GET    /tax-rules
GET    /tax-rules/:id
GET    /tax-rules/effective-at/:date
```

#### Tax Obligations

```
GET    /tax-obligations
GET    /tax-obligations?property_id=x&period=yyyy-mm
POST   /tax-obligations/generate
GET    /tax-obligations/due-soon
GET    /tax-obligations/aging
```

#### Tax Returns

```
POST   /tax-returns/generate
GET    /tax-returns
GET    /tax-returns/:id
GET    /tax-returns/:id/lines
PATCH  /tax-returns/:id/submit
GET    /tax-returns/:id/document
```

#### Tax Payments

```
POST   /tax-payments
GET    /tax-payments
GET    /tax-payments/:id
PATCH  /tax-payments/:id/confirm
```

#### ITF263

```
GET    /itf263-certificates
POST   /itf263-certificates/verify
GET    /itf263-certificates/:id/document
```

#### Compliance

```
POST   /compliance/check
GET    /compliance/check/:id
GET    /compliance/issues
PATCH  /compliance/issues/:id/resolve
POST   /compliance/audit-pack/generate
GET    /compliance/dashboard
```

---

### 3.3 Backend Services

#### ZimraService (NEW)

```typescript
-validateZimraProfile(dto) -
  registerPropertyForTax(propertyId, classification) -
  classifyProperty(propertyId) -
  getTaxClassification(propertyId);
```

#### TaxRuleService (NEW)

```typescript
-getRuleForDate(taxType, date) -
  calculateTaxObligation(input) -
  getEffectiveRates(month, year) -
  getAllActiveRules();
```

#### TenantComplianceService (NEW)

```typescript
-verifyIdentification(tenantId) -
  verifyTIN(tenantId) -
  getComplianceStatus(tenantId) -
  getIdentificationExpiry(tenantId);
```

#### TaxObligationService (NEW)

```typescript
-generateObligations(zimraProfileId, period) -
  calculateObligation(propertyId, leaseId, period) -
  getObligationsDueSoon(days) -
  getAgingReport(zimraProfileId) -
  reconcileObligations(period);
```

#### TaxReturnService (NEW)

```typescript
-generateReturn(zimraProfileId, period) -
  calculateReturnLines(returnId) -
  getTenantSchedule(returnId) -
  getPropertySchedule(returnId) -
  submitReturn(returnId, reference) -
  validateReturn(returnId) -
  exportReturn(returnId, format);
```

#### TaxPaymentService (NEW)

```typescript
-recordTaxPayment(obligationId, paymentId) -
  confirmPayment(paymentId, zimraReference) -
  trackPayment(paymentId) -
  getTaxPaymentSchedule(zimraProfileId, year);
```

#### ComplianceService (NEW)

```typescript
-runCompleteCheck(organizationId) -
  checkTaxProfile(zimraProfileId) -
  checkPropertyInfo(propertyId) -
  checkTenantIdentification(tenantId) -
  checkRentalRecords(propertyId, period) -
  checkPaymentReconciliation(propertyId, period) -
  checkDocumentation(organizationId) -
  generateAuditPack(organizationId, period) -
  generateComplianceReport(organizationId) -
  getSummaryStatus(organizationId);
```

#### ITF263Service (NEW)

```typescript
-verifyCertificate(certificateNumber) -
  getCertificateStatus(certificateNumber) -
  parseWithholdingRate(certificateId) -
  validateWithholdingCompliance(leaseId);
```

---

### 3.4 Mobile/Web UI Screens

#### Compliance Dashboard (NEW)

```
COMPLIANCE

Overall Status
├── Green/Amber/Red indicator
├── Compliance score (%)
├── Last check date
└── Next check due

ZIMRA Readiness
├── ✓/⚠/✗ Tax profile complete
├── ✓/⚠/✗ Property information
├── ✓/⚠/✗ Tenant identification
├── ✓/⚠/✗ Rental records complete
├── ✓/⚠/✗ Payment reconciliation
├── ✓/⚠/✗ Required documents

Tax Obligations
├── Tax due summary
│   ├── Amount
│   ├── Due date
│   ├── Days remaining
│   └── Status (pending/due/overdue)
│
├── Tax obligations list
│   ├── Filter by type, period, status
│   ├── Drill-down to detail
│   └── Payment tracking
│
└── Aging report
    ├── Current
    ├── 0-30 days
    ├── 31-60 days
    └── 60+ days

Issues & Remediation
├── Critical issues (red)
├── Warnings (amber)
├── Required actions
│
└── Remediation guides
    ├── Step-by-step instructions
    ├── Missing documents (with links)
    ├── Identify verification
    └── Data completion

Tax Returns
├── Return status
├── Return calendar
├── Draft return (for review)
├── Submission history

Tax Certificates (ITF263)
├── Current certificates
├── Expiry dates
├── Renewal needed

Audit Pack
├── Generate audit pack
├── Pack status
├── Download documents
└── Submission history
```

#### Tax Obligations Detail Screen

```
TAX OBLIGATION

Header
├── Obligation ID
├── Type (Presumptive Rental Tax)
├── Period
├── Status

Details
├── Tax rule applied
├── Taxable amount
├── Tax rate
├── Calculated tax
├── Currency

Due Date & Payment
├── Due date
├── Days until due
├── Payment status
├── Payment link (if due)

Supporting Detail
├── Property/lease link
├── Tenant link
├── Underlying transactions (drill-down)

Related
├── Tax return (when included)
├── Tax payment record
└── Audit trail
```

#### Tenant Identification Screen (NEW)

```
TENANT IDENTIFICATION

Identification Details
├── ID type (national ID, passport, etc)
├── ID number
├── Issue date
├── Expiry date
├── Document upload
├── Verification status
│   ├── ✓ Verified
│   ├── ⏳ Pending
│   └── ✗ Failed

TIN Details (NEW)
├── TIN number
├── Registered name
├── Verification status
├── Link to ZIMRA

Compliance Status
├── All required documents
├── Expiry warnings
└── Action items
```

#### Property Tax Classification Screen

```
PROPERTY TAX CLASSIFICATION

Property Info
├── Name
├── Address
├── Current status

Tax Classification
├── Primary residence / Rental / Investment / Mixed / Other
├── Annual rental value
├── Presumptive tax registered

Ownership for Tax
├── Tax owner (if different from property owner)
├── Ownership structure
├── Company registration (if applicable)
├── Trust documents (if applicable)

Capital Gains Tax (CGT)
├── Cost base
├── Acquisition date
├── When sold, CGT calculation will use this

Compliance Status
├── Complete ✓ / Incomplete ✗
├── Issues (if any)
└── Edit button
```

#### Tax Return Preparation Screen (NEW)

```
TAX RETURN

Return Period
├── Year
├── Return type

Status
├── Draft
├── Ready to file
├── Submitted
├── Assessed

Summary
├── Gross rental income
├── Allowable deductions
├── Net taxable income
├── Tax due

Schedules (Drill-down)
├── Property Schedule
│   └── All properties with rental income
│
├── Tenant Schedule
│   └── Withholding tax on each tenant
│
└── Income & Deduction Schedule
    ├── Rental income
    ├── Maintenance & repairs
    ├── Property taxes
    ├── Insurance
    ├── Management fees
    ├── Depreciation
    ├── Interest
    └── Other deductions

Action Items
├── Verify all income
├── Verify all deductions
├── Upload supporting documents
├── Attach lease agreements
├── Confirm tenant identification
├── Review calculations

Submit & Track
├── Submit to ZIMRA (button)
├── Submission reference
├── Assessment status (once submitted)
└── Any notices/assessments received
```

#### Compliance Issues List Screen (NEW)

```
COMPLIANCE ISSUES

Filter & Sort
├── By type
├── By severity (Critical / Warning / Info)
├── By status (Open / Resolved)
├── By entity (Tenant / Property / Lease / Payment / etc)

Issue List
├── [Issue] - Severity indicator
├── Entity link
├── Description
├── Impact statement
├── "View details" link
└── Status badge

Issue Detail
├── Title
├── Severity
├── Description
├── Impact (e.g., "Cannot file ZIMRA return")
├── Root cause
├── Remediation steps
│   ├── Step 1
│   ├── Step 2
│   └── Links to related screens
├── Required actions
│   ├── "Upload document"
│   ├── "Verify tenant ID"
│   └── "Complete property info"
├── Evidence (supporting documents)
└── Mark as Resolved (if complete)
```

---

### 3.5 Business Logic

#### Tax Obligation Generation

- Query all properties where owner is organization
- For each property with rentals in period:
  - Get lease info (rent amount, start/end dates)
  - Query tax_rules effective for that period
  - Calculate tax: rent × rate
  - Create tax_obligation record
  - Set due date based on tax type

#### Tax Return Generation

- Query all tax_obligations for period
- Sum gross rental income
- Query all expenses (deductible categories)
- Calculate net taxable income
- Apply tax rules for given period
- Generate tax_return with line items
- Create tenant schedule (for ITF263 withholding)
- Mark ready for submission

#### Compliance Check

- Check ZIMRA profile complete
- Check property tax classification
- Check all tenants have ID verification
- Check all leases have signed documents
- Check rent charges match payments + outstanding
- Check all expenses have documentation
- Check tax obligations on track
- Report issues with severity

#### Audit Pack Generation

- Gather all required documents for period:
  - Tax return
  - Tax payment proof
  - Property schedule
  - Tenant schedule
  - Signed leases
  - Tenant ID copies
  - Payment records
  - Expense invoices
  - Property valuation (if sales/CGT)
- Generate comprehensive index
- Create downloadable PDF package

---

### 3.6 Notifications

Events that trigger notifications:

```
TAX_OBLIGATION_DUE (7 days before)
TAX_OBLIGATION_OVERDUE (1 day after due)
TAX_RETURN_READY_FOR_FILING
TAX_RETURN_DUE_SOON (30 days)
TAX_PAYMENT_RECEIVED (ZIMRA confirmation)
ITF263_EXPIRING_SOON (60 days)
COMPLIANCE_ISSUE_IDENTIFIED (Critical)
TENANT_ID_EXPIRING_SOON (90 days)
PROPERTY_TAX_CLASSIFICATION_MISSING
AUDIT_PACK_READY
```

---

### 3.7 Reporting

#### Tax Compliance Report

- Tax profile status
- Obligations by type and period
- Payments received
- Returns filed
- Assessment results
- Overdue items

#### Tax Paid Summary

- By tax type
- By period
- Total annual tax
- Tax rate vs. regulations

#### Audit Trail

- Every tax obligation created/updated/paid
- Every tax return filed/assessed
- Every compliance check run
- Every issue resolved

---

### 3.8 Success Metrics

✓ All properties classified for tax purposes
✓ All active tenants have verified identification
✓ All leases have signed documents
✓ Tax obligations generated automatically, 95%+ accuracy
✓ Tax returns generated with correct calculations
✓ ITF263 certificates tracked and not expired
✓ Compliance dashboard shows no critical issues
✓ Audit pack assembles in < 1 minute
✓ Monthly tax payment deadlines never missed

---

## PHASE 4: INTELLIGENCE (6-8 weeks)

### Goals

- AI-powered insights and recommendations
- Predictive analytics (arrears, vacancy, maintenance)
- Automated explanations of financial data
- Compliance assistant and risk alerts

### 4.1 Core Capabilities

#### A. Financial Intelligence

```
"Your rent collection dropped 12% vs last month
because Units 2A and 3B became vacant."

"Tenant ABC Ltd has 3 months of arrears.
At current payment rate, they'll pay by June."

"Maintenance on Property X cost 23% more than
industry average for this property type."
```

#### B. Compliance Intelligence

```
"You have 5 days to pay $4,260 in presumptive tax.
Current account balance: $5,100. ✓ On track."

"Tenant XYZ needs ID renewal in 45 days.
Request copy before lease renewal."

"Your audit pack is 87% complete.
Missing: 2 property valuations, 1 purchase receipt."
```

#### C. Operational Intelligence

```
"Plumber ABC has 8.5/10 rating, avg response 2 hours.
Cost 15% below market. Recommend for recurring work."

"Unit 2A ready for lease signing (all docs uploaded).
Tenant move-in scheduled for 15th."

"You're paying $400/month for water but similar
properties pay $280. Request meter check."
```

#### D. Predictive Intelligence

```
"Based on payment history, Tenant ABC Ltd
has 15% risk of default in next 90 days."

"Unit 4A becoming vacant in 60 days.
Typical re-let time: 45 days. Start marketing now."

"Property X needs roof maintenance in 18 months.
Budget recommendation: $2,800."
```

### 4.2 Data Requirements

AI sits on top of validated financial data from Phase 1-3:

- Charges and payments (complete ledger)
- Expenses with categories
- Tenant payment history
- Unit occupancy timeline
- Lease start/end dates
- Maintenance history and costs
- Tax obligations and payments
- Comparable market data (for benchmarking)

### 4.3 API/Services for AI

#### InsightsService (NEW)

```typescript
-explainFinancialMetric(metric, period) -
  explainArrears(tenantId) -
  explainExpense(expenseId) -
  explainCompliance(issue) -
  explainOccupancy(unitId);
```

#### PredictionService (NEW)

```typescript
-predictDefaultRisk(tenantId, horizon) -
  predictVacancyRisk(unitId, horizon) -
  predictMaintenanceNeeds(propertyId, horizon) -
  predictExpenses(propertyId, horizon);
```

#### RecommendationService (NEW)

```typescript
-suggestCollectionAction(tenantId) -
  suggestVendor(maintenanceType, propertyId) -
  suggestRentAdjustment(leaseId) -
  suggestUtilityInvestigation(unitId) -
  suggestComplianceAction(issue);
```

#### BenchmarkingService (NEW)

```typescript
-compareExpenses(propertyId, category) -
  compareRents(propertyId, unitType) -
  compareOccupancy(propertyId) -
  compareCollectionRate(landlordId);
```

### 4.4 Mobile/Web UI

#### AI Assistant (Chat-like Interface)

```
"Ask me anything about your properties..."

Q: "Why is Unit 2A less profitable?"
A: "Rent is $50/month lower than Unit 2B,
    and it's vacant 20% more often. Recommend
    renovation to justify higher rent. Estimated
    ROI: 8 months."

Q: "What's my largest expense?"
A: "Maintenance at $1,200/month (32% of total).
    Your property is 15% above market average.
    Top vendor costs: Plumbing $450, Electrical $380."

Q: "Is my tax on track?"
A: "Yes. You've paid $2,100 of $4,260 owed this year.
    Next payment due Oct 5."
```

#### Insights Dashboard (NEW)

```
AI INSIGHTS

Today's Summary
├── 1 action required
├── 2 alerts
├── 3 opportunities

Trending
├── Collections trending ↓
├── Maintenance costs trending ↑
├── Occupancy stable

Risks
├── 1 tenant at default risk
├── Tax payment due in 7 days
├── Urgent maintenance needed

Opportunities
├── Re-rent unit 2A (vacant 60 days)
├── Renegotiate vendor rates
├── Expense reduction opportunity

Smart Recommendations
├── Suggest collecting from ABC Ltd
├── Recommend vendor switch
├── Suggest lease escalation timing
└── Suggest utility audit
```

#### Financial Explanation Screen

```
When user taps a metric:

OWNER INCOME: $3,450
     ↓
View Breakdown
     ↓
Rent                 $7,000
Utilities             -$400
Maintenance           -$900    [tap to detail]
Management Fee        -$350
Tax                   -$750    [tap to detail]
────────────────────────────
Net                   $3,450

[AI Explanation]
"Your income is up 8% vs last month.
Main reason: Unit 2B collected $500
they'd deferred from previous month."
```

---

### 4.5 AI Training Data

Built from validated:

- Ledger entries (source of truth)
- Historical transactions (24 months minimum)
- Tenant payment patterns
- Maintenance cost history
- Market benchmarks (anonymized peer data)
- Regulatory changes (ZIMRA rules)

**Critical**: AI trains only on validated, audited data. Never on draft or unreconciled records.

---

### 4.6 Risk Mitigation

#### AI Explainability

- Every recommendation includes "why"
- Links to underlying data
- Source transactions visible

#### AI Guardrails

- Never modify financial records
- Never auto-approve payments
- Never auto-submit tax returns
- Recommendations only

#### AI Transparency

- Show confidence score (e.g., "75% confidence")
- Show data recency
- Show assumptions

---

## IMPLEMENTATION ROADMAP

### Timeline Summary

| Phase            | Duration    | Start   | End     | Key Deliverables                                      |
| ---------------- | ----------- | ------- | ------- | ----------------------------------------------------- |
| **Phase 1**      | 12-16 weeks | Week 1  | Week 16 | Ledger, charges, payments, expenses, statements       |
| **Phase 2**      | 10-12 weeks | Week 12 | Week 27 | Utilities, maintenance, vendors, documents, approvals |
| **Phase 3**      | 8-10 weeks  | Week 21 | Week 34 | ZIMRA compliance, tax engine, audit pack              |
| **Phase 4**      | 6-8 weeks   | Week 28 | Week 39 | AI insights, recommendations, predictions             |
|                  |             |         |         |                                                       |
| **MVP Complete** | 34-39 weeks | Week 1  | Week 39 | Full platform per specification                       |

(Phases overlap to compress timeline)

---

## CRITICAL DEPENDENCIES

### Phase 1 is foundational

- Phase 2 depends on Phase 1 financial infrastructure
- Phase 3 depends on Phases 1 & 2 for compliance data
- Phase 4 depends on all previous phases for AI training

### No shortcuts

- Building AI first (Phase 4 before 1-3) will fail
- Skipping Phase 1 makes all subsequent work unreliable
- Phase 3 cannot be done without Phase 1 ledger

---

## RESOURCE REQUIREMENTS

### Backend (NestJS)

- **Phase 1**: 2-3 engineers (12-16 weeks)
- **Phase 2**: 2 engineers (10-12 weeks, parallel to Phase 1)
- **Phase 3**: 1-2 engineers (8-10 weeks)
- **Phase 4**: 1 engineer + 1 ML/data engineer (6-8 weeks)

### Frontend (React Native/Web)

- **Phases 1-3**: 2 engineers continuous
- **Phase 4**: 1 engineer (UI components for AI)

### QA

- 1 engineer per 2 developers
- Focus on financial data integrity and compliance

### Product/PM

- 1 throughout, with domain expertise in:
  - Property management
  - Zimbabwean tax law
  - Financial systems

---

## SUCCESS CRITERIA FOR MVP

### Phase 1 Complete

- ✓ All leases generate rent charges automatically
- ✓ Payments allocate to charges correctly
- ✓ Ledger balances (Assets = Liabilities + Equity)
- ✓ Owner statements match ledger
- ✓ Reconciliation runs monthly with no exceptions

### Phase 2 Complete

- ✓ All maintenance tracked end-to-end
- ✓ Utilities metered and billed
- ✓ Approvals complete without manual override
- ✓ Documents versioned and accessible
- ✓ Notifications deliver 95%+ successfully

### Phase 3 Complete

- ✓ ZIMRA profile can be registered
- ✓ All tenants have verified identification
- ✓ Tax obligations calculated and tracked
- ✓ Tax return generated with 100% accuracy
- ✓ ITF263 certificates validated
- ✓ Compliance dashboard shows readiness ≥ 90%
- ✓ Audit pack assembles in < 1 minute

### Phase 4 Complete

- ✓ AI explains major financial metrics
- ✓ Predictions tested against actual outcomes
- ✓ Recommendations acted on (80%+ adoption)
- ✓ No false positives on compliance alerts

---

## Next Steps

1. **Finalize Database Schema** (Week 1)
   - Create all entity models
   - Define indexes and constraints
   - Set up data migration scripts

2. **Build Phase 1 Backend API** (Weeks 2-8)
   - Rent schedule and charge generation
   - Enhanced payment service
   - Ledger service
   - Statement generation
   - Comprehensive testing

3. **Build Phase 1 Mobile UI** (Weeks 4-12)
   - Billing screens
   - Statements
   - Owner dashboard enhancements
   - Payment verification

4. **Deploy Phase 1 Beta** (Week 12)
   - Test with small landlord cohort
   - Collect feedback
   - Refine financial logic

5. **Parallelize Phases 2-3** (Weeks 12-27)
   - Build operational features
   - Build compliance engine
   - Integrate with ZIMRA requirements

6. **Compliance Testing** (Weeks 25-30)
   - Validate tax calculations
   - Test ZIMRA return generation
   - Audit pack verification

7. **Phase 4 AI Development** (Weeks 28-35)
   - Train on validated Phase 1-3 data
   - Build insight generation
   - Test predictions

8. **Go Live** (Week 39)
   - Full platform deployment
   - Landlord + property manager + compliance user testing
   - Final hardening

---

This plan transforms LogicTag Properties into a comprehensive, trustworthy property operating system fit for Zimbabwe's regulatory environment.
