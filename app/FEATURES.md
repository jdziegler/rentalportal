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

## Feature 2: Lease Document Storage & E-Signatures [PLANNED]
Upload lease PDFs and collect e-signatures from tenants.

- [ ] 2.1 Schema — Document and Signature models
- [ ] 2.2 File upload infrastructure — local/S3 storage, upload/download/delete API
- [ ] 2.3 Landlord document management UI — Documents tab on lease detail
- [ ] 2.4 E-signature flow — signing link, signature pad, audit trail
- [ ] 2.5 Tenant portal documents tab
- [ ] 2.6 Tests

## Feature 3: Tenant Screening Integration [PLANNED]
Credit checks, background checks, eviction history via third-party provider.

- [ ] 3.1 Research & provider selection (TransUnion SmartMove, RentPrep, Checkr)
- [ ] 3.2 Schema — ScreeningRequest and ScreeningReport models
- [ ] 3.3 Screening API integration with adapter pattern
- [ ] 3.4 Screening request UI on tenant detail page
- [ ] 3.5 Tenant consent flow
- [ ] 3.6 Application integration
- [ ] 3.7 Tests

## Feature 4: Accounting Export (CSV & QuickBooks) [PLANNED]
Export financial data for accountants.

- [ ] 4.1 Enhanced CSV export engine — `src/lib/export.ts`
- [ ] 4.2 Export API endpoints — transactions, rent roll, tenant ledger, 1099
- [ ] 4.3 Export UI — dropdown buttons, date range picker
- [ ] 4.4 QuickBooks Online integration — OAuth, sync, account mapping
- [ ] 4.5 QuickBooks settings UI
- [ ] 4.6 Tests

## Feature 5: Email & SMS Notifications [DONE]
Automated notifications for rent reminders, maintenance updates, lease expirations.

- [x] 5.1 Notification infrastructure — `src/lib/notifications.ts` with Resend (email) + Twilio (SMS), unified `sendNotification()` with logging
- [x] 5.2 Notification templates — 7 types: rent_reminder, rent_overdue, payment_received, late_fee_charged, maintenance_update, lease_expiring, new_message
- [x] 5.3 Notification triggers — daily cron (`/api/cron/notifications`) for reminders/overdue/lease expiry + event-driven for maintenance status, messages, late fees
- [x] 5.4 Notification preferences — `NotificationPreference` model with per-contact email/SMS toggle and per-type suppression
- [ ] 5.5 Notification preferences UI — settings page for landlord + tenant portal (future)
- [x] 5.6 Notification history — `NotificationLog` model with channel, status, error tracking
- [x] 5.7 Tests — 13 unit tests for all email/SMS templates (`src/lib/notifications.test.ts`)

## Feature 6: Multi-User Access & Permissions [PLANNED]
Invite property managers, co-owners, or assistants with role-based access.

- [ ] 6.1 Schema — Team, TeamMember, TeamInvite models
- [ ] 6.2 Role definitions — Owner, Manager, Viewer, Maintenance
- [ ] 6.3 Permission middleware — `src/lib/permissions.ts`
- [ ] 6.4 Team management UI in Settings
- [ ] 6.5 Invitation flow — email invite, accept page, OAuth
- [ ] 6.6 UI permission guards — hide/disable based on role
- [ ] 6.7 Data scoping — filter all queries by team membership
- [ ] 6.8 Tests
