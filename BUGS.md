# PropertyPilot - Bugs

Bugs found during product audit. Ordered by severity.

---

## Critical (App-Breaking)

### ~~BUG-1: All "Add" and detail link buttons navigate to non-existent pages~~ ✅ FIXED
- All CRUD pages now exist for Properties, Units, Tenants, Leases, Transactions, Maintenance
- Listings still missing detail/create/edit pages

### ~~BUG-2: No sign-out button anywhere in the app~~ ✅ FIXED
- Sign-out available in user profile dropdown in sidebar

---

## High (Incorrect Data Display)

### ~~BUG-3: Property type displays raw integer instead of human-readable text~~ ✅ FIXED
- Property types now map to "Single Family", "Multi-Family", "Commercial"

### ~~BUG-4: Lease status uses integer codes without clear mapping~~ ✅ FIXED
- Lease statuses displayed as badges: Active (green), Expired (red), Terminated (gray)

### ~~BUG-5: Transaction list limited to 50 records with no pagination or indication~~ ✅ FIXED
- Pagination with page size selector (25/50/100) and total count display

---

## Medium (Missing Functionality / UX Issues)

### BUG-6: Billing page doesn't indicate current subscription plan
- **Affected page**: Settings > Billing
- **Behavior**: All three plan cards show "Subscribe" buttons equally. No visual distinction for the user's current plan.
- **Expected**: Current plan should be highlighted, show "Current Plan" badge, and the subscribe button should change to "Manage" or be disabled

### BUG-7: No error feedback on API failures
- **Affected pages**: All pages making API calls
- **Behavior**: If a data fetch fails, pages either show empty content or crash with no user-friendly message
- **Expected**: Error messages displayed to the user with retry option

### BUG-8: Stripe Connect "Update Account" button shown even when not applicable
- **Affected page**: Settings > Payments
- **Behavior**: "Update Account" button always appears when connected, but may fail if account is fully verified and doesn't need updates
- **Expected**: Only show when account has pending requirements

### BUG-9: Settings Account page shows raw Stripe IDs without context
- **Affected page**: Settings > Account
- **Behavior**: Displays stripeCustomerId, stripeSubscriptionId, stripePriceId as raw strings (e.g., "cus_abc123") which are meaningless to users
- **Expected**: Either hide these technical IDs or translate them to user-friendly labels (plan name, subscription status)

### BUG-10: No loading states on initial page load for data-heavy pages
- **Affected pages**: All list pages (Properties, Units, Tenants, Leases, Transactions, Listings)
- **Behavior**: Pages appear blank or flash while server components fetch data
- **Expected**: Skeleton loaders or loading indicators

---

## Low (Minor / Cosmetic)

### ~~BUG-11: Dashboard "Coming soon" cards provide no timeline or context~~ ✅ FIXED
- Dashboard now has real stat cards, recent transactions, and expiring leases

### BUG-12: Empty phone/email fields show dash instead of being hidden
- **Affected page**: Tenants list
- **Behavior**: Missing email or phone shows "—" taking up visual space
- **Expected**: Consider hiding empty columns or showing "Not provided" with an "add" link

### BUG-13: Sidebar has no active section highlighting for Settings sub-pages
- **Affected page**: All Settings pages
- **Behavior**: While nav links highlight the active page, the Settings section doesn't collapse/expand and all sub-links are always visible
- **Expected**: Collapsible Settings section, or at minimum clear active state on sub-links

### BUG-14: Listing cards show truncated description with no "read more" option (partially moot — needs detail page)
- **Affected page**: Listings
- **Behavior**: Description truncated to 2 lines with CSS, no way to see full text without going to a detail page (which doesn't exist)
- **Expected**: Either show full text or provide expand/read-more functionality

### BUG-15: Stripe webhook handler uses `as any` type casts
- **Affected file**: `/api/stripe/webhook`
- **Behavior**: TypeScript safety bypassed with `as any` casts on Stripe SDK v20 response types
- **Impact**: Could mask type errors; fragile if Stripe SDK changes
- **Expected**: Properly type the webhook event data or use documented type narrowing

---

## New Bugs (Discovered During Development)

### BUG-16: Mobile card backgrounds not rendering correctly on real devices
- **Affected pages**: All list pages with mobile cards
- **Behavior**: On actual mobile devices (not browser DevTools), the white card backgrounds appear "squished to the left" — the text content is fine but the `bg-white rounded-lg shadow` container doesn't extend full width
- **Status**: Unresolved. Attempted fixes: `overflow-x-hidden` on layout, `min-w-0` on main, global CSS `max-width: 100vw`, responsive filter grids. None fixed on real devices.
- **Impact**: Visual only, content is readable

### BUG-17: No toast/feedback after form submissions
- **Affected pages**: All create/edit/delete actions
- **Behavior**: After creating, editing, or deleting an entity, user is redirected but gets no confirmation toast
- **Expected**: Sonner toast showing "Property created", "Lease deleted", etc.
