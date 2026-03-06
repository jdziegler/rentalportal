# Tenant Portal - Build Plan

Lightweight tenant portal with email/SMS code verification. Separate from landlord auth.

---

## 1. Schema & Data Model

- [x] `TenantVerification` model (identifier, code, expiresAt, type: email/sms)
- [x] `Message` model (contactId, userId, leaseId, body, sender: landlord/tenant, timestamps)
- [x] Add `paymentToken` (UUID) to `Lease` for direct payment links
- [x] Run `prisma db push`

## 2. Dependencies

- [x] Install `resend` (email delivery)
- [x] Install `twilio` (SMS delivery)
- [x] Add `RESEND_API_KEY` and `TWILIO_*` env vars to `.env`

## 3. Tenant Auth (code verification)

- [x] `POST /api/tenant/send-code` — lookup contact by email/phone, send 6-digit code
- [x] `POST /api/tenant/verify-code` — validate code, set `tenant-token` JWT cookie
- [x] `GET /api/tenant/session` — return current tenant session from cookie
- [x] Tenant session middleware/helper (verify JWT, extract contact IDs)
- [x] `/tenant` — login page (enter email or phone)
- [x] `/tenant/verify` — enter 6-digit code page

## 4. Tenant Portal Layout

- [x] `/tenant/(portal)/layout.tsx` — minimal portal shell (nav: Pay, Maintenance, Messages)
- [x] Lease picker if tenant has multiple active leases
- [x] Session guard (redirect to `/tenant` if no valid token)

## 5. Pay Rent

- [x] `/tenant/(portal)/pay` — shows balance, charges, payment history for selected lease
- [x] "Pay Now" button -> Stripe Checkout session (via landlord's Connect account)
- [x] `POST /api/tenant/pay` — create Stripe Checkout session
- [x] Webhook handles payment confirmation, updates transaction + creates Payment record
- [x] Payment success/cancel return pages

## 6. Maintenance Requests

- [x] `/tenant/(portal)/maintenance` — list tenant's requests + submit new
- [x] `POST /api/tenant/maintenance` — create request (scoped to tenant's leases)
- [x] `GET /api/tenant/maintenance` — list requests for tenant's contacts

## 7. Messaging

- [x] `/tenant/(portal)/messages` — conversation thread with landlord
- [x] `GET /api/tenant/messages` — list messages for contact
- [x] `POST /api/tenant/messages` — send message as tenant
- [x] Landlord-side: message UI on contact detail page
- [x] `GET /api/messages` — landlord endpoint to list/send messages

## 8. Landlord Integration

- [x] "Send Portal Link" button on tenant/contact detail page
- [x] Copy-to-clipboard payment link per lease
- [x] Unread message indicator in landlord sidebar
- [x] Maintenance requests from tenants appear in existing maintenance list (uses same MaintenanceRequest model)

## 9. Polish

- [x] Mobile-responsive tenant portal (uses Tailwind responsive classes throughout)
- [x] Rate limiting on code sending (max 5 per hour per identifier)
- [x] Code expiry cleanup (cleaned up on successful verification)
- [x] Error states and loading skeletons on tenant pages
