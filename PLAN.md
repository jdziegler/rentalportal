# PropertyPilot — Product Plan

Target: Solo landlords and small operators managing 1-100 units.
Differentiator: AI-first property management. Simple by default, powerful when needed.

---

## Design Philosophy

TenantCloud is a 2014-era app with 50+ feature flags, deeply nested menus, and enterprise
complexity crammed into a small-landlord product. We don't want to clone it.

Modern apps that small operators love (Linear, Mercury, Notion, Stripe Dashboard) share
common traits:
- **Entity-centric pages** — click a property, see everything about it in one place
- **Command palette / global search** — Cmd+K to jump anywhere
- **Inline editing** — click a cell to edit, no separate "edit page"
- **Activity feeds** — timeline of what happened, not just current state
- **AI assistance** — draft lease terms, categorize transactions, answer "how much did I spend on repairs at 123 Main St last year?"

Our guiding principle: **every screen should answer a question a landlord actually asks.**
- Dashboard: "How's my portfolio doing right now?"
- Property page: "What's going on at this property?"
- Tenant page: "What's this tenant's history?"
- Lease page: "What are the terms and is rent current?"

We will NOT build:
- Occupancy boards, Kanban views, or project management theater
- 15 report types on day one (3 great ones beat 15 mediocre ones)
- Inspection templates with 50 configurable sections
- Feature gating behind 4 subscription tiers

We WILL build:
- A fast, clean app that handles the 90% use case in 2 clicks
- An AI layer that handles the remaining 10%
- Simple online rent collection that just works

---

## Architecture Decisions

### Data Model Changes Needed

Current schema is close but needs additions for the plan below:

```
NEW MODELS:
  MaintenanceRequest  — id, propertyId, unitId, leaseId?, contactId?, title, description, priority, status, createdAt
  Note                — id, entityType, entityId, body, createdAt (polymorphic, attaches to anything)
  File                — id, entityType, entityId, name, url, size, type, createdAt
  Activity            — id, userId, entityType, entityId, action, meta(JSON), createdAt

SCHEMA CHANGES:
  Lease: add lateFeeEnabled, lateFeeAmount, lateFeeGraceDays, lateFeeType (onetime/daily)
  Lease: add previousLeaseId (self-relation for renewals)
  Transaction: add accountCategory (rent, late_fee, repair, utility, insurance, management, other)
  Transaction: add voidedAt, voidReason
  Transaction: add recurringRuleId (link to recurring rule)
  Listing: add many more fields (photos, features, pets, deposit, etc.)
  Contact: add emergencyName, emergencyPhone
  Property: add imageUrl
```

### Tech Stack (Keep)
- Next.js App Router with server components + server actions
- Prisma + PostgreSQL
- Auth.js (Google OAuth, add email/password later for tenants)
- Stripe (subscriptions + Connect for rent collection)
- Tailwind CSS
- Vercel AI SDK (future: Claude for AI features)

### UI Component Strategy
- Use **shadcn/ui** for form controls, dialogs, dropdowns, data tables
- Keep the sidebar navigation pattern
- Add a **command palette** (Cmd+K) early — it becomes the AI interface later
- Use **server actions** for all mutations (no REST API routes for CRUD)
- Use **optimistic updates** with `useOptimistic` for fast feeling

---

## Phase 1: Make It Usable (Core CRUD + Bug Fixes)

Goal: A landlord can manage their portfolio without needing TenantCloud.

### 1.1 Fix Critical Bugs
- [x] Add sign-out button to sidebar (BUG-2)
- [x] Map property type integers to labels (BUG-3)
- [x] Show current plan on billing page (BUG-6)
- [x] Hide raw Stripe IDs on account page, show human-readable info (BUG-9)

### 1.2 Property Pages
- [x] `/properties/[id]` — detail page: info card, units list, financial summary
- [x] `/properties/new` — create form (server action)
- [x] `/properties/[id]/edit` — edit form
- [ ] Inline edit on detail page (click field to edit, auto-save)
- [x] Archive property (soft delete)
- [ ] Property image upload (single hero image)

### 1.3 Unit Pages
- [x] `/units/[id]` — detail page: unit info, current lease + tenant, transaction history
- [x] `/units/new` — create form with property selector
- [x] `/units/[id]/edit` — edit form
- [ ] Inline edit on detail page
- [ ] Vacancy badge and days-vacant counter

### 1.4 Tenant Pages
- [x] `/tenants/[id]` — detail page: contact info, leases (current + past), payment history
- [x] `/tenants/new` — create form
- [x] `/tenants/[id]/edit` — edit form
- [x] Tenant status system (Pending, Invited, Active, Inactive)
- [x] Tenant filters (status dropdown, search by name/email/phone)
- [ ] Inline edit on detail page
- [ ] Balance summary (owed vs paid)

### 1.5 Lease Pages
- [x] `/leases/[id]` — detail page: terms, tenant, unit, payment schedule, transaction list
- [x] `/leases/new` — creation form: select unit, tenant, set terms
- [x] `/leases/[id]/edit` — edit form
- [x] Lease status transitions: activate, expire, terminate
- [x] Auto-mark unit as rented/vacant on lease create/terminate
- [x] Grace period field (configurable per lease)
- [ ] Lease renewal (create new lease from existing, link as previous)

### 1.6 Transaction Pages
- [x] `/transactions/new` — manual income/expense entry
- [x] Transaction detail with edit capability
- [x] Void transaction (status-based, not hard delete)
- [x] Mark as paid / record payment (partial and full)
- [x] Waive transaction
- [x] Payment progress bar and dialog
- [x] Pagination with page size selector (25/50/100)
- [x] Category filter (income/expense) + status filter + date range filter + property filter + contact filter
- [x] Summary cards: Paid, Outstanding, Overdue (respects grace period)
- [x] Default date filter: "This Month"
- [x] Fixed floating-point currency bug (cents-based integer arithmetic)

### 1.7 Listing Pages
- [x] `/listings/[id]` — detail page with full listing info
- [x] `/listings/new` — create from vacant unit, auto-populate fields
- [x] Activate/deactivate toggle
- [x] Listing edit page

### 1.8 Maintenance Requests
- [x] `/maintenance` — list with priority and status badges
- [x] `/maintenance/new` — create form
- [x] `/maintenance/[id]` — detail page with status workflow
- [x] `/maintenance/[id]/edit` — edit form
- [x] Status transitions: Open → In Progress → Completed / Cancelled

### 1.9 Global UX
- [x] Command palette (Cmd+K) — cross-entity search
- [ ] Breadcrumb navigation on all detail pages
- [x] Toast notifications for all actions (create, edit, delete, errors)
- [ ] Empty states with CTAs ("Add your first property")
- [ ] Loading skeletons on all pages
- [x] Mobile-responsive tables (card layout on small screens) — all 6 list pages
- [x] All table/card cells tappable with links to detail pages
- [x] Search dialog positioned above keyboard on mobile

---

## Phase 2: Financial Operations

Goal: A landlord can track all money in and out without a spreadsheet.

### 2.1 Dashboard Upgrade
- [x] Monthly income vs expenses (current month)
- [x] Recent transactions (last 5)
- [x] Expiring leases (next 30 days)
- [x] Occupancy rate (occupied / total units)
- [x] Stat cards: Properties, Units, Active Leases, Tenants, Income MTD, Expenses MTD
- [ ] Trend vs previous month (arrow indicators)
- [ ] Upcoming rent due (next 7 days)
- [ ] Overdue balances (top 5 tenants)

### 2.2 Recurring Charges
- [x] Auto-generate monthly rent charges from active leases
- [x] Cron job or scheduled function: run daily, create charges on due date
- [ ] Support other recurring charges (utilities, fees) per lease

### 2.3 Late Fees
- [x] Late fee configuration per lease (amount, grace days, one-time vs daily)
- [x] Auto-apply late fee after grace period
- [ ] Late fee visible on tenant balance and lease detail

### 2.4 Balance Tracking
- [ ] Running balance per tenant (charges - payments)
- [ ] Balance visible on: tenant detail, lease detail, dashboard
- [ ] Aging buckets (current, 30, 60, 90+ days)

### 2.5 Reports (Start Simple)
- [ ] Rent roll: all active leases, rent amounts, balances — export CSV
- [ ] Income & expense: by property, by month — export CSV
- [ ] Tenant statement: all charges and payments for one tenant — export PDF

### 2.6 Transaction Categories
- [ ] Predefined categories: rent, late_fee, deposit, repair, utility, insurance, management, other
- [ ] Category shown on transaction list with color coding
- [ ] Filter by category

---

## Phase 3: Rent Collection

Goal: Tenants can pay rent online. Landlord gets paid automatically.

### 3.1 Tenant Payment Portal
- [ ] Public payment page per lease (no login required, accessed via unique link)
- [ ] Shows: amount due, lease info, payment history
- [ ] Pay via ACH ($1.95) or card (3.5% + $0.30)
- [ ] Confirmation page + email receipt

### 3.2 Payment Links
- [ ] Landlord can generate and send payment link per tenant
- [ ] Link sent via email with amount due
- [ ] One-click pay for tenants

### 3.3 Auto-Pay
- [ ] Tenant can enable auto-pay (saves payment method, charges on due date)
- [ ] Landlord dashboard shows auto-pay status per tenant

### 3.4 Payment Notifications
- [ ] Email to landlord: payment received, payment failed
- [ ] Email to tenant: rent due reminder (configurable days before), payment receipt, late fee applied

### 3.5 Stripe Dashboard
- [ ] Show Connect account balance and recent payouts
- [ ] Link to full Stripe dashboard for details

---

## Phase 4: Communication & Maintenance

Goal: Landlords and tenants can communicate and handle maintenance.

### 4.1 Maintenance Requests
- [ ] MaintenanceRequest model: title, description, priority (low/medium/high/emergency), status (open/in_progress/completed), photos
- [ ] Create from landlord UI or tenant payment portal
- [ ] Status updates with notes
- [ ] Photo upload on creation and updates
- [ ] Email notification on new request and status change

### 4.2 Notes & Activity
- [ ] Notes attachable to any entity (property, unit, tenant, lease)
- [ ] Activity feed on entity detail pages (auto-generated: "Lease created", "Payment received $1,200", "Late fee applied $50")
- [ ] Activity feed on dashboard (recent activity across all entities)

### 4.3 Email Notifications
- [ ] Configurable notifications: rent due, payment received, lease expiring, maintenance update
- [ ] Use Resend or AWS SES for transactional email
- [ ] Notification preferences in settings

### 4.4 Document Storage
- [ ] Upload files to any entity (lease agreements, insurance docs, photos)
- [ ] S3/R2 storage backend
- [ ] View/download from entity detail pages
- [ ] Storage usage tracking

---

## Phase 5: AI Agent Layer

Goal: The AI handles routine tasks and answers questions in natural language.

### 5.1 Command Palette AI Mode
- [ ] Cmd+K opens search; typing a question switches to AI mode
- [ ] "How much rent did I collect last month?" -> queries DB, returns answer
- [ ] "Send a late notice to all tenants with overdue balances" -> drafts notices, asks confirmation
- [ ] "Create a lease for unit 4B, tenant John Smith, $1,500/mo starting April 1" -> fills form, asks confirmation

### 5.2 Smart Transaction Categorization
- [ ] AI auto-categorizes imported transactions (from bank feed or manual entry)
- [ ] Learns from user corrections

### 5.3 Lease Draft Assistant
- [ ] AI generates lease terms based on property, market data, and landlord preferences
- [ ] Suggests rent amount, deposit, late fee terms

### 5.4 Maintenance Triage
- [ ] AI reads maintenance request description + photos
- [ ] Suggests priority level and category
- [ ] Drafts response to tenant

### 5.5 Proactive Alerts
- [ ] AI monitors portfolio and surfaces insights:
  - "3 leases expire in the next 60 days"
  - "Unit 2A has been vacant for 45 days, 2x your average"
  - "Repair costs at 456 Oak are 40% above your other properties"
- [ ] Weekly email digest with AI-generated portfolio summary

### 5.6 Natural Language Reporting
- [ ] "Show me my P&L for 2025" -> generates report
- [ ] "Which tenants are behind on rent?" -> filtered tenant list
- [ ] "Compare occupancy this year vs last year" -> chart

---

## Phase 6: Growth & Polish

### 6.1 Rental Applications
- [ ] Online application form linked to listing
- [ ] Application review workflow (received -> reviewed -> approved/denied)
- [ ] Application fee collection via Stripe
- [ ] Tenant screening integration (TransUnion or similar)

### 6.2 Listing Syndication
- [ ] Publish listings to Zillow, Apartments.com via API
- [ ] Photo gallery with drag-and-drop ordering
- [ ] Lead capture and tracking

### 6.3 Lease E-Signatures
- [ ] Generate lease PDF from template + lease data
- [ ] Send for signature via email
- [ ] Track signature status
- [ ] Store signed document

### 6.4 Multi-User / Team
- [ ] Invite co-owners or property managers
- [ ] Role-based access (admin, manager, viewer)
- [ ] Activity log per team member

### 6.5 Accounting Integration
- [ ] QuickBooks Online sync (transactions, categories)
- [ ] CSV export formatted for common accounting software

### 6.6 Mobile App
- [ ] React Native or PWA
- [ ] Core flows: view dashboard, record payment, create maintenance request
- [ ] Push notifications

---

## Immediate Next Steps (What to Build Now)

Priority order for the next coding sessions:

1. **Install shadcn/ui** — buttons, inputs, selects, dialogs, data tables, command palette, toast
2. **Sign-out button** in sidebar (BUG-2, takes 5 minutes)
3. **Property detail page** (`/properties/[id]`) — our template for all detail pages
4. **Property create/edit** using server actions + shadcn form components
5. **Repeat for units, tenants, leases** (same pattern, fast once property is done)
6. **Transaction pagination + filters**
7. **Command palette** (Cmd+K) — even before AI, this is the fastest way to navigate
8. **Dashboard widgets** — replace "Coming soon" with real data

Each of these is a focused task that can be completed in one session. The pattern
established in #3-4 makes #5 fast because every entity page follows the same structure:
list -> detail -> create/edit -> delete/archive.
