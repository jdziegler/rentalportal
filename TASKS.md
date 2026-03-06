# PropertyPilot - Feature Tasks

This document defines the features needed to build a complete property management app for small landlords (1-100 units). Features are organized by priority tier and functional area.

---

## Tier 1: Core CRUD (Foundation)

Without these, the app is read-only and unusable for day-to-day management.

### T1-1: Property Detail & Edit Page ✅
- [x] `/properties/:id` detail page showing all property info, associated units, and summary stats (occupancy rate, total rent, vacancy count)
- [x] Edit form: name, type (single/multi-family), address fields, description, amenities
- [x] Delete property (with confirmation)
- [x] Display property type as human-readable text, not raw integer
- [x] All cells tappable (units link to unit detail, tenants link to tenant detail, transactions link to transaction detail)

### T1-2: Property Create Page ✅
- [x] `/properties/new` form to add a new property
- [x] Required fields: name, type, street address, city, state, zip
- [x] Optional: description, amenities, year built
- [x] Redirect to detail page on success

### T1-3: Unit Detail & Edit Page ✅
- [x] `/units/:id` detail page showing unit info, current lease, current tenant, and transaction history
- [x] Edit form: name, property assignment, bedrooms, bathrooms, size (sq ft), rent price, security deposit, features, pet policy
- [x] Delete unit (with cascade warning)
- [x] Show occupancy status with current tenant name and lease dates
- [x] All cells tappable (tenant, lease, transactions linked)

### T1-4: Unit Create Page ✅
- [x] `/units/new` form to add a unit under a specific property
- [x] Property selector dropdown
- [x] Fields: name, bedrooms, bathrooms, size, rent price, deposit, features, pet policy
- [x] Redirect to detail page on success

### T1-5: Tenant Detail & Edit Page ✅
- [x] `/tenants/:id` detail page showing contact info, current lease(s), payment history
- [x] Edit form: first name, last name, email, phone, address, notes
- [x] Delete tenant (with confirmation)
- [x] Quick links to associated lease, property/unit, and transactions
- [ ] Balance summary (owed vs paid)

### T1-6: Tenant Create Page ✅
- [x] `/tenants/new` form to add a tenant
- [x] Fields: first name, last name, email, phone, address

### T1-7: Lease Detail & Edit Page ✅
- [x] `/leases/:id` detail page showing full lease terms, linked property/unit, tenant, and transaction history
- [x] Edit form: rent amount, start/end date, lease type, due day, deposit, grace period
- [x] Terminate lease action (with confirmation)
- [x] All related entities linked (property, unit, tenant, transactions)
- [ ] Renew lease action (create new lease from existing, link as previous)

### T1-8: Lease Create Page ✅
- [x] `/leases/new` form to create a lease
- [x] Unit selector, tenant selector
- [x] Fields: lease type (fixed/month-to-month), start date, end date, rent amount, rent period, due day, deposit, grace period
- [x] Auto-mark unit as rented on creation

### T1-9: Transaction Create Page ✅
- [x] Ability to manually record income and expense transactions
- [x] Fields: date, amount, category (income/expense), property/unit, tenant, description, payment method, status

### T1-10: Transaction Detail & Edit ✅
- [x] View full transaction details with status badge, paid amount, balance
- [x] Edit transaction (amount, date, description, category)
- [x] Void transaction (status-based)
- [x] Mark as paid / record partial payment / waive
- [x] Payment progress bar and action buttons

### T1-11: Listing Detail & Edit Page ✅
- [x] `/listings/:id` detail page showing full listing with description, unit details, property info
- [x] Edit form: unit, price, description, active status
- [x] Activate/deactivate listing toggle
- [x] Delete listing with confirmation dialog

### T1-12: Listing Create Page ✅
- [x] `/listings/new` form to create a listing
- [x] Unit selector shows property name + unit name
- [x] Fields: unit, price, description, active status

---

## Tier 2: Essential Property Management Features

These make the app actually useful for managing rentals day-to-day.

### T2-1: Dashboard - Monthly Income Summary ✅
- [x] Monthly income and expenses for current month
- [x] Stat cards: Properties, Units, Occupancy, Active Leases, Tenants, Income MTD, Expenses MTD
- [ ] Compare to previous month (trend arrow)

### T2-2: Dashboard - Recent Transactions ✅
- [x] Last 5 transactions displayed
- [x] Show date, description, amount, and category

### T2-3: Dashboard - Upcoming Rent Due
- [ ] Widget showing leases with rent due in next 7 days
- [ ] Show tenant name, property/unit, amount due, due date
- [ ] Highlight overdue amounts in red

### T2-4: Dashboard - Lease Expirations ✅ (partial)
- [x] Widget showing leases expiring in next 30 days
- [ ] Quick action to renew or terminate

### T2-5: Search & Filter on All List Pages ✅
- [x] Tenant search by name, email, phone + status filter
- [x] Transaction filters: category, status, date range (presets + custom), property, contact
- [x] Global command palette search (Cmd+K) across all entities
- [x] Filters on Properties, Units, Leases, Listings, Maintenance list pages

### T2-6: Pagination on All List Pages ✅
- [x] Transaction pagination with page size selector (25/50/100)
- [x] Pagination on Properties, Units, Tenants, Leases, Maintenance, Listings

### T2-7: Late Fee Configuration & Automation
- Configure late fees per lease: one-time amount, daily amount, grace period, max daily limit
- Auto-generate late fee transaction when rent is overdue (or flag for manual creation)
- Display late fee status on lease detail

### T2-8: Rent Tracking & Balance per Tenant
- Track balance per tenant/lease (amount owed vs paid)
- Show balance on tenant detail and lease detail pages
- Aging report: current, 30-day, 60-day, 90-day overdue buckets

### T2-9: Lease Status Management ✅
- [x] Ability to change lease status (active, expired, terminated)
- [x] Auto-convert fixed-term leases to month-to-month when end date passes (cron job)
- [ ] Mark unit as vacant when lease terminates/expires

### T2-10: Property/Unit Vacancy Tracking
- Clearly display vacancy status on property and unit pages
- Vacancy count on dashboard
- Days vacant metric per unit

---

## Tier 3: Rent Collection & Payments

These enable the core revenue flow for landlords.

### T3-1: Tenant Payment Portal
- Tenant-facing page to pay rent (no login required, or tenant login)
- Show amount due, lease details, payment history
- Accept ACH and card payments via Stripe Connect
- Display fee breakdown (ACH $1.95 or Card 3.5% + $0.30)

### T3-2: Payment Request / Invoice Generation
- Landlord can send payment request to tenant (email with payment link)
- Auto-generate monthly rent invoices based on lease terms
- Invoice tracks: amount, due date, paid date, status

### T3-3: Recurring Rent Charges
- Auto-create rent charge transactions monthly based on lease terms
- Configurable: auto-charge tenant payment method or create invoice only
- Track recurring vs one-time transactions

### T3-4: Payment Method Management
- Tenants can save payment methods (bank account, card)
- Landlord can see payment method status (not details) per tenant
- Support adding/removing payment methods

### T3-5: Stripe Connect Payout Dashboard
- Show landlord's Stripe Connect balance
- Show payout schedule and history
- Show pending vs available funds

### T3-6: Payment Receipt & Confirmation
- Auto-send payment receipt to tenant on successful payment
- Landlord notification on payment received
- PDF receipt generation

---

## Tier 4: Communication & Documents

### T4-1: Tenant Notifications
- Email notifications for: rent due reminder, payment received, lease expiration, late fee applied
- Configurable notification preferences per landlord
- Notification log/history

### T4-2: Document Storage
- Upload and store documents per property, unit, lease, or tenant
- Document types: lease agreements, insurance certificates, inspection reports, photos
- View/download documents from detail pages

### T4-3: Lease Agreement Generation
- Generate lease agreement PDF from lease data
- Template-based with customizable terms
- E-signature tracking (signed/unsigned status)

### T4-4: Notes System
- Add notes to properties, units, tenants, and leases
- Timestamped note history
- Internal-only (landlord notes, not visible to tenants)

---

## Tier 5: Reporting & Analytics

### T5-1: Income & Expense Report ✅
- [x] Monthly/quarterly/annual income and expense breakdown
- [x] Filter by property, date range (presets + custom)
- [x] Exportable to CSV

### T5-2: Rent Roll Report
- List of all active leases with: property, unit, tenant, rent amount, balance
- Total monthly expected rent
- Collection rate percentage

### T5-3: Occupancy Report
- Occupancy rate by property and portfolio-wide
- Historical occupancy trend (monthly)
- Average days vacant per unit

### T5-4: Profit & Loss Statement
- Net income by property and total
- Categorized expenses
- Month-over-month comparison

### T5-5: Tax Preparation Export
- Annual income/expense summary suitable for Schedule E
- Categorized by property
- Exportable to CSV

---

## Tier 6: Advanced Features

### T6-1: Maintenance Request Tracking ✅ (core)
- [x] Landlord CRUD for maintenance requests
- [x] Track: title, description, priority (low/medium/high/urgent), status (open/in-progress/completed/cancelled), category
- [x] Assign to property/unit/contact
- [x] Status workflow buttons on detail page
- [ ] Tenants can submit via portal
- [ ] Photo upload on creation and updates
- [ ] Communication thread per request

### T6-2: Rental Application Management
- Online application form for prospective tenants
- Application status tracking (received, reviewed, approved, denied)
- Link to listing
- Collect application fee

### T6-3: Tenant Screening Integration
- Credit check and background screening via third-party service
- Results linked to application
- Configurable screening packages

### T6-4: Roommate & Co-Tenant Support
- Multiple tenants per lease
- Split rent configuration
- Individual payment tracking per roommate

### T6-5: Utility Tracking
- Track which utilities are landlord-paid vs tenant-paid per lease
- Record utility expenses
- Utility billing pass-through to tenants

### T6-6: Insurance Tracking
- Track required insurance per lease
- Store proof of insurance documents
- Expiration alerts

### T6-7: Multi-User / Team Access
- Invite property managers or co-owners
- Role-based permissions (admin, manager, viewer)
- Activity log per user

---

## Tier 7: UX & Platform Quality

### T7-1: Global Navigation Improvements (partial)
- [ ] Breadcrumb navigation on all pages
- [x] User profile dropdown with sign-out
- [ ] Collapsible sidebar sections
- [x] Mobile-responsive navigation (hamburger menu)
- [x] Command palette (Cmd+K) with global search

### T7-2: Empty States ✅
- [x] Meaningful empty states on all list pages when no data exists
- [x] Call-to-action buttons ("Add your first property", etc.)
- [ ] Onboarding guidance for new users

### T7-3: Loading States
- [ ] Skeleton loaders on all data-fetching pages
- [ ] Button loading states on all form submissions
- [ ] Optimistic UI updates where appropriate

### T7-4: Error Handling
- [ ] Error boundary component for graceful failures
- [ ] User-friendly error messages on all API failures
- [ ] Form validation with inline error messages
- [ ] Toast/notification system for success/error feedback

### T7-5: Current Plan Display in Billing ✅ (partial)
- [x] Show which plan the user is currently on
- [ ] Show usage vs plan limits (units, leases)
- [x] Highlight current plan in plan cards
- [ ] Show billing history/invoices

### T7-6: Data Export
- Export any list view to CSV
- Bulk export of all data
- Transaction export for accounting software

### T7-7: Onboarding Flow
- First-time user guided setup: create property, add units, add tenants, create leases
- Progress indicator
- Skip option

### T7-8: Mobile Responsiveness ✅ (mostly)
- [x] All 6 list pages have mobile card layouts (no horizontal scrolling)
- [x] Responsive filters (grid on mobile, flex on desktop)
- [x] Mobile sidebar hamburger toggle
- [x] Search dialog positioned above keyboard on mobile
- [ ] Fix mobile card background rendering (white cards squished left on real devices — unresolved)
