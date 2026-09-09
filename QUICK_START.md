# LogicTag Properties MVP Implementation — Quick Start Guide

**Created**: 2026-09-08  
**Status**: Ready for Development

---

## 📋 What You're Building

A **Zimbabwe-focused Property Operating System** that transforms LogicTag from a mobile CRM into a trustworthy, auditable platform for:

- ✓ Financial management (ledger, billing, payments, statements)
- ✓ Operational workflows (maintenance, utilities, approvals)
- ✓ Tax compliance (ZIMRA tax engine, obligation tracking)
- ✓ Intelligence (AI-powered insights and recommendations)

---

## ⏱️ Timeline at a Glance

```
Phase 1: Financial (12-16w) ----→ Ledger, charges, payments, expenses
  ├→ Phase 2: Operations (10-12w)  → Maintenance, utilities, documents
  │   └→ Phase 3: Compliance (8-10w) → ZIMRA tax engine, audit pack
  │       └→ Phase 4: AI (6-8w)      → Insights & predictions
  └─────────────────────────────────────────────────────────
  MVP Complete in 34-39 weeks (with overlaps)
```

**Key Rule**: Phase 1 is foundational. Don't skip it or all subsequent work fails.

---

## 🎯 Phase 1: Financial Foundation — Week 1-16

### What You're Delivering

✓ Rent schedules that auto-generate charges  
✓ Payment allocations to specific charges  
✓ Double-entry ledger (accounting foundation)  
✓ Owner statements (income - expenses = net)  
✓ Reconciliation (bank vs. ledger)  
✓ Expense tracking

### Database Changes

**New Tables**: 15+

- `rent_schedules`, `charges`, `charge_adjustments`
- `refunds`, `expenses`
- `ledger_accounts`, `ledger_transactions`, `ledger_entries`
- `owner_statements`

**Modified Tables**: 3

- `leases` (add escalation, termination fields)
- `payments` (add verification, payer_type)
- `payment_allocations` (add tracking)

See `IMPLEMENTATION_PLAN.md` Section 1.1 for full schema.

### API Endpoints to Build

```
POST   /leases/:leaseId/rent-schedule
GET    /charges (with filters)
PATCH  /payments/:id/allocate
POST   /expenses
GET    /properties/:propertyId/statements
POST   /ledger/reconciliation-check
```

### Backend Services

- **BillingService** (generate charges from schedules)
- **ExpenseService** (track & approve expenses)
- **LedgerService** (double-entry ledger)
- **StatementService** (generate owner statements)
- **ReconciliationService** (monthly reconciliation)

### Mobile/Web Screens

1. **Billing Section** (new)
   - View rent charges
   - Outstanding balances by tenant (aging report)
   - Expense tracking
   - Statements

2. **Payments Section** (enhance)
   - Auto-allocate payments to oldest charges
   - Manual allocation option
   - Payment verification

3. **Dashboard** (enhance)
   - Show net income (not just collected rent)
   - Outstanding balance
   - Monthly trend

### Testing

- ✓ Unit: charge calculations, allocation logic, ledger balancing
- ✓ Integration: payment → allocation → ledger → statement
- ✓ E2E: tenant pays → owner statement updates same day

### Success Criteria

- All charges traceable to lease + rent schedule
- Ledger balances (Assets = Liabilities + Equity)
- Owner statements match ledger
- Monthly reconciliation has 0 exceptions
- All audit trails complete

---

## 🏗️ Phase 2: Operational Foundation — Week 12-27

### What You're Delivering (overlaps Phase 1)

✓ Utilities metering & billing  
✓ Maintenance workflows (request → quote → approval → completion)  
✓ Vendor management & ratings  
✓ Document versioning system  
✓ Approval workflows (flexible)  
✓ Event-driven notifications

### Database Changes

**New Tables**: 20+

- `utility_meters`, `utility_readings`, `utility_tariffs`, `utility_bills`, `utility_allocations`
- `maintenance_quotes`, `maintenance_approvals`, `maintenance_costs`
- `vendor_ratings`, `vendor_documents`
- `documents`, `document_versions`, `document_links`, `document_access`
- `workflows`, `workflow_steps`, `approvals`
- `notification_templates`, `notification_preferences`, `notifications`, `notification_deliveries`

See `IMPLEMENTATION_PLAN.md` Section 2.1 for full schema.

### Key Workflows

1. **Maintenance**: Report → Assign → Quote → Approve → Complete → Invoice → Pay
2. **Expense**: Create → Submit → Approve → Pay → Record in ledger
3. **Maintenance → Expense → Ledger**: Workflow automatically updates financial statements

### New Screens

- Utilities (meter readings, bills, consumption charts)
- Maintenance (requests, quotes, costs, completion)
- Vendors (directory, ratings, performance metrics)
- Documents (upload, version, share, access control)
- Approvals Hub (pending actions, review, approve/reject)
- Notifications (inbox, preferences, delivery status)

### Backend Services

- **UtilityService** (metering, tariffs, billing, allocation)
- **MaintenanceService** (requests, quotes, approvals, costs)
- **VendorService** (directory, ratings, performance)
- **DocumentService** (versioning, linking, access)
- **WorkflowService** (approvals, step tracking, escalation)
- **NotificationService** (event-driven, preferences, delivery)

### Success Criteria

- All maintenance tracked end-to-end
- All utilities metered and billed correctly
- All vendor performance tracked
- All documents versioned (no silent overwrites)
- All approvals complete without manual override
- Notification delivery ≥ 95%

---

## 🏛️ Phase 3: Zimbabwe Compliance — Week 21-34

### What You're Delivering (overlaps Phases 1-2)

✓ ZIMRA tax profile registration  
✓ Property tax classification (rental, primary, investment, etc)  
✓ Tenant identification verification (national ID + TIN)  
✓ Automatic tax obligation calculation  
✓ Tax return generation with schedules  
✓ ITF263 certificate management  
✓ Compliance checks & audit pack  
✓ Compliance readiness dashboard

### Critical: This Uses Phase 1 Data

Tax obligations are calculated from ledger charges (Phase 1).  
Tax returns use payment records (Phase 1).  
Compliance checks verify financial data (Phase 1).

**If Phase 1 is wrong, tax calculations are wrong.**

### Database Changes

**New Tables**: 12+

- `zimra_profiles`, `zimra_profile_documents`
- `tax_rules` (versioned, not hard-coded)
- `tax_obligations`, `tax_returns`, `tax_return_lines`
- `tax_payments`
- `itf263_certificates`
- `compliance_checks`, `compliance_issues`, `compliance_evidence`, `compliance_audit_packs`
- `tenant_identifications`, `tenant_tin`

See `IMPLEMENTATION_PLAN.md` Section 3.1 for full schema.

**Modified Tables**: 1

- `properties` (add tax classification, ownership structure, acquisition date for CGT)

### Tax Rule Engine (Critical)

```typescript
// WRONG: Hard-coded
const TAX_RATE = 0.15;

// CORRECT: Versioned, date-effective
const rule = await getTaxRule("PRIT_2025");
if (rule.effective_from <= date && date <= rule.effective_to) {
  const tax = rentAmount * rule.rate;
  // Store rule_version_id with transaction
}
// If law changes, new rule created, old data preserved
```

### Key Compliance Workflows

1. **Tax Obligation Generation**
   - Query all leases (active during tax period)
   - Get rent amounts
   - Apply tax rule effective for that period
   - Generate tax obligation
   - Set due date

2. **Tax Return Generation**
   - Sum all rent charges for period
   - Query all expenses (deductible categories)
   - Calculate net taxable income
   - Generate return with schedules
   - Tenant schedule (for ITF263 withholding)
   - Mark ready for filing

3. **Compliance Check**
   - ✓ ZIMRA profile complete
   - ✓ All properties classified
   - ✓ All tenants have ID verification
   - ✓ All leases have signed documents
   - ✓ Charges = payments + outstanding
   - ✓ All expenses documented
   - ✓ Tax obligations on track
   - Report issues with severity

4. **Audit Pack Generation**
   - Gather all required docs (tax return, proof, leases, IDs, payments, receipts)
   - Create index
   - Generate downloadable PDF package

### Compliance Dashboard

```
COMPLIANCE STATUS

Overall: 87% ✓ Green

✓ Tax profile
✓ Property information
⚠ 2 tenants missing ID (warning)
⚠ Tax payment due in 7 days (warning)
⚠ 1 return not prepared (warning)

[View Issues]
[Generate Audit Pack]
[Submit to ZIMRA]
```

### New Screens

- ZIMRA Profiles (register, manage documents)
- Property Tax Classification (choose type, ownership structure)
- Tenant Identification (verify national ID, TIN)
- Tax Obligations (due soon, aging, payment tracking)
- Tax Returns (generate, review, submit)
- Tax Certificates (ITF263 management)
- Compliance Issues (list, severity, remediation steps)
- Audit Pack (assemble, download, submit)

### Backend Services

- **ZimraService** (profile registration, tax classification)
- **TaxRuleService** (version management, rate lookup)
- **TaxObligationService** (generate, calculate, track)
- **TaxReturnService** (generate, validate, export)
- **TenantComplianceService** (verify ID, TIN, expiry)
- **ComplianceService** (run checks, generate audit pack)
- **ITF263Service** (validate certificates)

### Notifications

- `TAX_OBLIGATION_DUE` (7 days before)
- `TAX_RETURN_READY_FOR_FILING`
- `ITF263_EXPIRING_SOON` (60 days)
- `COMPLIANCE_ISSUE_IDENTIFIED` (critical only)
- `TENANT_ID_EXPIRING_SOON` (90 days)

### Success Criteria

- All properties classified for tax
- All active tenants have verified ID + TIN
- Tax obligations generated with ≥ 95% accuracy
- Tax returns pass validation
- ITF263 certificates tracked & not expired
- Compliance dashboard ≥ 90% ready
- Audit pack assembles in < 1 minute

---

## 🤖 Phase 4: Intelligence — Week 28-39

### What You're Delivering

✓ Financial metric explanations  
✓ Default risk predictions  
✓ Vacancy predictions  
✓ Maintenance cost forecasting  
✓ Compliance alerts  
✓ Benchmarking vs. market

### Critical: AI Only on Validated Data

AI builds on top of Phase 1 ledger + Phase 3 compliance checks.

**Never**:

- Invent financial facts
- Auto-approve payments
- Auto-submit tax returns
- Hard-code calculations

**Only**:

- Explain existing data
- Predict based on history
- Recommend actions
- Alert on exceptions

### Sample AI Interactions

```
Q: "Why is Unit 2A less profitable?"
A: "Rent is $50/month lower than similar units,
    and it's vacant 20% more often. Estimated
    ROI if renovated: 8 months."

Q: "Is my tax on track?"
A: "Yes. You've paid $2,100 of $4,260 owed.
    Next payment due Oct 5. Current balance: $5,100. ✓"

Q: "Which tenant might default?"
A: "Tenant ABC Ltd is 3 months behind. At current
    payment rate: paid by June. Risk: 15% (based on
    payment history). Recommend: Contact by Oct 1."
```

### AI Services to Build

- **InsightsService** (explain metrics, drill-down)
- **PredictionService** (default risk, vacancy, maintenance)
- **RecommendationService** (actions, vendor switches, rent adjustments)
- **BenchmarkingService** (compare expenses, rents, occupancy)

### New Screens

- **AI Assistant** (chat-like interface)
- **Insights Dashboard** (trending, risks, opportunities, recommendations)
- **Financial Breakdown** (metric with full drill-down + AI explanation)

### Success Criteria

- AI explains major metrics correctly
- Predictions validated against actual outcomes
- 80%+ of recommendations acted upon
- No false positives on compliance alerts

---

## 🚀 Development Checklist

### Before Phase 1 Coding Starts

- [ ] Review `IMPLEMENTATION_PLAN.md` sections 1.1-1.7
- [ ] Finalize database schema with team
- [ ] Create TypeORM entities for all new tables
- [ ] Set up test fixtures (sample leases, charges, payments)
- [ ] Define ledger account chart of accounts
- [ ] Create sample tax rules for testing

### Phase 1 Milestones

- **Week 2-3**: Database migrations, TypeORM entities
- **Week 4-6**: BillingService (generate charges)
- **Week 6-8**: PaymentService (allocations, verification)
- **Week 8-10**: LedgerService (double-entry, reconciliation)
- **Week 10-12**: StatementService & UI screens
- **Week 12-16**: Testing, bug fixes, hardening

### Code Quality Standards (All Phases)

- ✓ No silent updates to financial records (use reversals)
- ✓ All financial operations logged
- ✓ All calculations include unit tests
- ✓ Ledger entries have matching debit/credit
- ✓ Foreign keys prevent orphaned records
- ✓ Soft deletes on financial records
- ✓ Audit trail shows who did what when

---

## 📊 Database Architecture Summary

```
CORE (existing)
├── users, organizations, roles, permissions
├── properties, units
├── tenants, leases
└── maintenance, vendors

PHASE 1 (financial)
├── rent_schedules
├── charges, charge_adjustments
├── payments, payment_allocations, refunds
├── expenses
├── ledger_accounts, ledger_transactions, ledger_entries
└── owner_statements

PHASE 2 (operational)
├── utility_*, maintenance_*, vendor_*
├── documents, document_versions, document_links
├── workflows, approvals
└── notifications

PHASE 3 (compliance)
├── zimra_profiles
├── tax_rules, tax_obligations, tax_returns
├── tax_payments, itf263_certificates
├── compliance_checks, compliance_issues
└── tenant_identifications, tenant_tin

PHASE 4 (intelligence)
└── insights (views/computed tables, not stored)
```

---

## ⚠️ Critical Gotchas

### ❌ Don't Do This

1. **Hard-code tax rates** → Tax law changes → All old data corrupted
   - Use versioned `tax_rules` with `effective_from`/`effective_to`

2. **Silently update payments** → No audit trail → Can't reconcile
   - Use `PaymentReversal` instead of UPDATE

3. **Calculate balances from charges - payments** → Rounding errors → Ledger doesn't balance
   - Use ledger as source of truth

4. **Assume every property has title deed** → Zimbabwe has trusts, cessions, leasehold
   - Support multiple `ownership_type`

5. **Make one dashboard for landlord + property manager + tenant** → Confusing UX
   - Use role-specific dashboards

6. **Trust payment amount without verification** → Fraud risk
   - Store proof (receipt, reference, timestamp, verifier)

### ✅ Do This Instead

1. Version all important data (leases, documents, tax rules)
2. Make audit trail immutable (append-only or reversals)
3. Provide data completeness score
4. Design for regulatory changes (tax rules, compliance requirements)
5. Test financial logic exhaustively
6. Show every number's source (drill-down to transactions)

---

## 📞 Questions to Answer Before Starting

1. **Tax Year**: Does your client use Jan-Dec or Apr-Mar tax year? (Affects when obligations are due)
2. **ITF263**: Do all landlords have ITF263 or just some?
3. **VAT**: Should system track VAT separately or included in rent?
4. **Withholding**: When tenant pays rent, does 10% go to ZIMRA?
5. **Presumptive Tax**: Are clients under presumptive rental income or actual?
6. **Bank Integration**: Will system connect to bank for reconciliation, or manual upload?
7. **Payment Providers**: Which providers (bank transfer, Innbucks, mobile money, cash)?
8. **Audit Trail Level**: Who needs to see audit logs? (Owner, manager, admin, ZIMRA?)

---

## 📈 Success Metrics by Phase

| Metric                      | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
| --------------------------- | ------- | ------- | ------- | ------- |
| Ledger balances             | ✓       | ✓       | ✓       | ✓       |
| Charges traceable           | ✓       | ✓       | ✓       | ✓       |
| Statements accurate         | ✓       | ✓       | ✓       | ✓       |
| Reconciliation 0 exceptions | ✓       | ✓       | ✓       | ✓       |
| All maintenance tracked     | -       | ✓       | ✓       | ✓       |
| Documents versioned         | -       | ✓       | ✓       | ✓       |
| Approvals automated         | -       | ✓       | ✓       | ✓       |
| Tax accuracy ≥ 95%          | -       | -       | ✓       | ✓       |
| Compliance ≥ 90% ready      | -       | -       | ✓       | ✓       |
| Audit pack in < 1 min       | -       | -       | ✓       | ✓       |
| Predictions validated       | -       | -       | -       | ✓       |
| Recommendations adopted     | -       | -       | -       | ✓       |

---

## 📚 Documentation

| File                        | Purpose                                     |
| --------------------------- | ------------------------------------------- |
| `IMPLEMENTATION_PLAN.md`    | **Full technical specification** (45 pages) |
| `TRANSFORMATION_ROADMAP.md` | Quick reference in repository memory        |
| This file                   | Quick-start guide for developers            |

---

## 🎓 Team Onboarding

1. **Read** this file (Quick Start) — 15 min
2. **Skim** IMPLEMENTATION_PLAN.md sections for your phase — 30 min
3. **Deep dive** into data models for your phase — 1-2 hours
4. **Pair program** Phase 1 rent schedule generation — 2-4 hours
5. **Start coding**

---

## 🤝 Next Steps

1. **Week 1**: Get team alignment on IMPLEMENTATION_PLAN.md
2. **Week 1**: Create database schema + TypeORM entities
3. **Week 2**: Start Phase 1 backend (BillingService)
4. **Week 3**: Start Phase 1 UI (Billing screens)
5. **Week 12**: Beta test Phase 1 with landlord cohort
6. **Week 12**: Start Phase 2 (parallel)
7. **Week 21**: Start Phase 3 (parallel)
8. **Week 28**: Start Phase 4 (parallel)
9. **Week 39**: Launch complete platform

---

**Ready to transform LogicTag into a property operating system?** Start with Phase 1. Everything else depends on it.
