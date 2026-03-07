# PropertyPilot QA Test Plan

Last updated: 2026-03-07

## List Pages (screenshots/live/)

- [x] Landing page
- [x] Login page
- [x] Dashboard
- [x] Properties list
- [x] Units list
- [x] Tenants list
- [x] Leases list
- [x] Transactions list
- [x] Maintenance list (empty state)
- [x] Listings list
- [x] Reports index
- [x] Settings — Rent Automation
- [x] Settings — Account
- [x] Settings — Billing
- [x] Settings — Payments

## Detail Pages (screenshots/detail/)

- [x] Property detail
- [x] Unit detail
- [x] Tenant detail
- [x] Lease detail
- [x] Transaction detail
- [ ] Maintenance detail (if any exist)
- [x] Listing detail

## Create/Edit Forms (screenshots/forms/)

- [x] New Property form
- [x] New Unit form
- [x] New Tenant form
- [x] New Lease form
- [x] New Transaction form
- [x] New Maintenance Request form
- [x] New Listing form
- [x] Edit Property form
- [x] Edit Unit form
- [x] Edit Tenant form
- [x] Edit Lease form
- [x] Edit Transaction form
- [ ] Edit Maintenance Request form
- [x] Edit Listing form

## Reports (screenshots/reports/)

- [x] Rent Roll report
- [x] Income & Expense report
- [x] Tenant Statement report

## Tenant Portal (screenshots/tenant-portal/)

- [x] Tenant login page
- [ ] Tenant dashboard
- [ ] Tenant messages
- [ ] Tenant maintenance

## Functional Flows

- [ ] AI chatbot responds to questions
- [ ] Search (Cmd+K) returns results
- [ ] Stripe checkout flow loads
- [ ] Stripe Connect onboarding loads

## Mobile Responsive (screenshots/mobile/)

- [x] Dashboard (375px)
- [x] Properties list (375px)
- [x] Tenant detail (375px)
- [x] Lease detail (375px)

## Empty State — New User (screenshots/empty/)

- [ ] Dashboard (with onboarding checklist)
- [ ] Properties (empty)
- [ ] Units (empty)
- [ ] Tenants (empty)
- [ ] Leases (empty)
- [ ] Transactions (empty)
- [ ] Listings (empty)

## Bugs Found

| # | Page | Issue | Status |
|---|------|-------|--------|
| 1 | Dashboard | Currency missing trailing zero ($57,944.5) | Fixed |
| 2 | Maintenance | Pagination showing on empty state | Fixed |
| 3 | Listings list | Raw HTML in description previews | Fixed |
| 4 | Listing detail | HTML rendered as plain text | Fixed |
| 5 | Dashboard | Onboarding checklist shown for existing users | Fixed |
| 6 | Sidebar | "opertyPilot" text cutoff | Won't fix (Next.js dev badge) |
| 7 | Rent Roll | 404 — page route missing (was CSV-only) | Fixed |
| 8 | Edit Listing | Raw HTML tags in description textarea | Fixed |
| 9 | Lease detail | Title showed just label "97" instead of property/unit | Fixed |
| 10 | Transaction detail | Breadcrumb showed raw CUID instead of description | Fixed |
| 11 | Unit detail | Type showed "Unknown" for unset types | Fixed |
| 12 | Tenant Statement | tenantId query param ignored (expected contactId) | Fixed |
| 13 | Income & Expense | All income categorized as "Other Income" instead of "Rent" | Fixed |
| 14 | Mobile lease detail | Summary card amounts truncated at 375px | Fixed |
