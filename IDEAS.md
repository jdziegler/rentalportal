# PropertyPilot - Next Up

Prioritized work remaining, organized by phase.

---

## Phase 1 Stragglers (Polish)

- [ ] Loading skeletons on all list pages
- [ ] Vacancy badge + days-vacant counter on units
- [ ] Tenant balance summary (owed vs paid) on tenant detail
- [ ] Lease renewal action (create new lease from existing)
- [ ] Property image upload (single hero image)
- [ ] Inline editing on detail pages (click field to edit, auto-save)

## Phase 2: Financial Operations

- [x] Recurring rent charges (auto-generate monthly)
- [x] Late fee automation (one-time + daily accrual)
- [x] Payment model (separate payment records from invoices)
- [ ] Balance tracking per tenant/lease — running balance, aging buckets (current/30/60/90)
- [ ] Balance visible on: tenant detail, lease detail, dashboard
- [ ] Reports: rent roll (all active leases + balances) — CSV export
- [ ] Reports: income & expense by property/month — CSV export
- [ ] Reports: tenant statement (all charges + payments) — PDF export
- [ ] Transaction categories with color coding (rent, late_fee, deposit, repair, utility, etc.)
- [ ] Dashboard: upcoming rent due (next 7 days)
- [ ] Dashboard: overdue balances (top 5 tenants)
- [ ] Dashboard: trend arrows vs previous month

## Phase 3: Rent Collection

- [ ] Tenant payment portal (public page per lease, no login required)
- [ ] Payment links (landlord generates + sends via email)
- [ ] Auto-pay setup flow (tenant saves payment method)
- [ ] Payment notifications (email: received, failed, receipt)
- [ ] Stripe Connect payout dashboard (balance, payouts, pending)

## Phase 4: Communication & Documents

- [ ] Notes system (attachable to any entity, timestamped)
- [ ] Activity feed on entity detail pages (auto-generated)
- [ ] Activity feed on dashboard (recent across all entities)
- [ ] Email notifications (rent due, payment received, lease expiring, late fee)
- [ ] Document storage (upload to any entity, S3/R2 backend)
- [ ] Notification preferences in settings

## Phase 5: AI Agent Layer

- [ ] Cmd+K AI mode ("How much rent did I collect last month?")
- [ ] Smart transaction categorization (auto-categorize, learn from corrections)
- [ ] Lease draft assistant (suggest terms based on market/preferences)
- [ ] Maintenance triage (AI reads description, suggests priority)
- [ ] Proactive alerts ("3 leases expire in 60 days", weekly digest)
- [ ] Natural language reporting ("Show me P&L for 2025")

## Phase 6: Growth & Polish

- [ ] Rental application management + fee collection
- [ ] Listing syndication (Zillow, Apartments.com)
- [ ] Lease e-signatures (PDF generation + signing)
- [ ] Multi-user / team access with roles
- [ ] Accounting integration (QuickBooks sync, CSV export)
- [ ] Mobile app (PWA or React Native)
