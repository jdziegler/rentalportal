# PropertyPilot Feature Roadmap

Build order: 1 → 5 → 4 → 2 → 3 → 6

## Feature 1: Late Fees & Auto-Charging [DONE]
Automatically charge late fees when rent is overdue.

- [x] 1.1 Schema changes — lateFeeEnabled, lateFeeType, lateFeeAmount, lateFeeAccrual, lateFeeMaxAmount on Lease
- [x] 1.2 Late fee calculation engine — `src/lib/late-fees.ts` with pure functions (calculateLateFee, shouldChargeFee, getLateFeeDetails)
- [x] 1.3 Cron job — `/api/cron/late-fees` daily endpoint calls `assessLateFees()` in `rent-automation.ts`
- [x] 1.4 Lease form UI — late fee config section on new/edit lease forms (`components/lease-form.tsx`)
- [x] 1.5 Tenant portal visibility — late fees labeled distinctly in payment history
- [x] 1.6 Tests — 20 unit tests for calculation, trigger logic, edge cases (`src/lib/late-fees.test.ts`)

## Feature 2: Lease Document Storage & E-Signatures [DONE]
Upload lease PDFs and collect e-signatures from tenants.

- [x] 2.1 Schema — `LeaseDocument` and `Signature` models with audit trail fields (IP, user agent, timestamp)
- [x] 2.2 File upload infrastructure — local disk storage (`uploads/`), upload/download/delete API (`/api/documents`, `/api/documents/[id]`), 10MB max, PDF/image/Word types
- [x] 2.3 Landlord document management UI — Documents section on lease detail page (`components/lease-documents.tsx`) with upload, delete, request signature, copy signing link
- [x] 2.4 E-signature flow — `/sign` page with canvas signature pad, token-based signing links, `/api/sign` endpoint, sign/decline with audit trail
- [x] 2.5 Tenant portal documents tab — `/tenant/documents` page showing pending & completed signatures with "Review & Sign" links
- [x] 2.6 Tests — 19 unit tests for document CRUD, signature lifecycle, file validation, access control (`src/lib/documents.test.ts`)

## Feature 3: Tenant Screening Integration [DONE]
Credit checks, background checks, eviction history via adapter pattern (mock provider, swap for TransUnion/Checkr).

- [x] 3.1 Provider architecture — adapter pattern with `ScreeningProvider` interface, `MockScreeningProvider` for dev/demo
- [x] 3.2 Schema — `ScreeningRequest` (status lifecycle, consent token, expiry) and `ScreeningReport` (credit/criminal/eviction with scores and details)
- [x] 3.3 Screening API — `/api/screening` (create/list), `/api/screening/[id]` (detail), `/api/screening/consent` (tenant consent endpoint)
- [x] 3.4 Screening request UI — `TenantScreening` component on tenant detail page with credit score bar, report viewer, consent link copy
- [x] 3.5 Tenant consent flow — `/screening/consent` page with FCRA disclosure, 7-day expiry, auto-runs screening on consent
- [x] 3.6 Screening service — `src/lib/screening.ts` with `createScreeningRequest()`, `processConsent()`, `getProvider()` functions
- [x] 3.7 Tests — 20 unit tests for mock provider, scoring, report types, provider registry (`src/lib/screening.test.ts`)

## Feature 4: Accounting Export (CSV & QuickBooks) [DONE]
Export financial data for accountants.

- [x] 4.1 Enhanced CSV export engine — `src/lib/export.ts` with csvEscape, buildCSV, csvResponse, formatDate, formatCurrency
- [x] 4.2 Export API endpoints — `/api/export/transactions` (with filters), `/api/export/tenant-ledger` (per-tenant), plus existing rent-roll and income-expense
- [x] 4.3 Export UI — "Export CSV" button on Transactions page (passes current filters) and Tenant Statement page
- [ ] 4.4 QuickBooks Online integration — OAuth, sync, account mapping (future)
- [ ] 4.5 QuickBooks settings UI (future)
- [x] 4.6 Tests — 14 unit tests for CSV builder, escaping, date/currency formatting (`src/lib/export.test.ts`)

## Feature 5: Email & SMS Notifications [DONE]
Automated notifications for rent reminders, maintenance updates, lease expirations.

- [x] 5.1 Notification infrastructure — `src/lib/notifications.ts` with Resend (email) + Twilio (SMS), unified `sendNotification()` with logging
- [x] 5.2 Notification templates — 7 types: rent_reminder, rent_overdue, payment_received, late_fee_charged, maintenance_update, lease_expiring, new_message
- [x] 5.3 Notification triggers — daily cron (`/api/cron/notifications`) for reminders/overdue/lease expiry + event-driven for maintenance status, messages, late fees
- [x] 5.4 Notification preferences — `NotificationPreference` model with per-contact email/SMS toggle and per-type suppression
- [ ] 5.5 Notification preferences UI — settings page for landlord + tenant portal (future)
- [x] 5.6 Notification history — `NotificationLog` model with channel, status, error tracking
- [x] 5.7 Tests — 13 unit tests for all email/SMS templates (`src/lib/notifications.test.ts`)

## Feature 6: Multi-User Access & Permissions [DONE]
Invite property managers, co-owners, or assistants with role-based access.

- [x] 6.1 Schema — `Team`, `TeamMember`, `TeamInvite` models with unique constraints and expiry
- [x] 6.2 Role definitions — Owner (full), Manager (read/write most), Viewer (read-only), Maintenance (maintenance only)
- [x] 6.3 Permission middleware — `src/lib/permissions.ts` with `hasPermission()`, `canRead()`, `canWrite()`, `getPermissions()` + team CRUD functions
- [x] 6.4 Team management UI — `/settings/team` page with invite form, member list, role management, pending invites
- [x] 6.5 Invitation flow — `/api/team/invites` (create), `/invite` page (accept), 7-day token expiry, copy invite link
- [x] 6.6 API routes — `/api/team` (get/create), `/api/team/members/[userId]` (update role/remove), `/api/team/invites/accept`
- [x] 6.7 Sidebar integration — Team nav item in Settings section
- [x] 6.8 Tests — 21 unit tests for roles, permissions, read/write guards, hierarchy consistency (`src/lib/permissions.test.ts`)
