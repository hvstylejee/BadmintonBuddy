# Badminton Court Booking Platform — Technical Architecture

**Document:** Technical Architecture Specification  
**Version:** 1.0  
**Target:** Next.js full-stack application  
**Primary deployment:** Vercel or equivalent  
**Primary database:** PostgreSQL  
**ORM:** Prisma  
**Language:** TypeScript

---

# 1. Architecture Goals

The architecture must:

- Be fully implementable in Next.js.
- Keep frontend and backend in one repository initially.
- Provide a strong transactional booking engine.
- Prevent double booking.
- Support multiple venues/courts.
- Support venue-specific pricing/policies.
- Support online and manual bookings.
- Make payment processing idempotent.
- Keep domain logic separate from UI.
- Be extensible to other sports.
- Be testable without browser automation.
- Allow later extraction into services if scale requires it.

---

# 2. Recommended Stack

## Application

```text
Next.js
TypeScript
React
App Router
Server Components
Server Actions where appropriate
Route Handlers for APIs/webhooks
```

## UI

```text
Tailwind CSS
shadcn/ui
Radix primitives where useful
React Hook Form
Zod
```

## Data

```text
PostgreSQL
Prisma
Redis
```

## Authentication

Use Auth.js/NextAuth or an equivalent provider abstraction.

Possible login methods:

```text
Email/password
Phone OTP
Google OAuth
```

The architecture must not hard-code one identity provider.

## Payments

India-first:

```text
Razorpay
```

Create a provider abstraction:

```ts
interface PaymentProvider {
  createOrder(input: CreatePaymentOrderInput): Promise<PaymentOrder>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifiedPayment>;
  refund(input: RefundInput): Promise<RefundResult>;
}
```

## Storage

Use S3-compatible object storage or Cloudinary.

## Cache/locks

Redis is recommended for:

- Rate limiting.
- Availability caching.
- Temporary checkout data.
- Distributed locks where useful.

Do NOT use Redis as the sole source of truth for booking inventory.

## Email

Provider abstraction:

```text
Resend
Amazon SES
SMTP
```

---

# 3. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │      Browser         │
                         │  Next.js React UI    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Next.js         │
                         │ App Router / APIs    │
                         └──────────┬───────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
       ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
       │ Booking Domain │  │ Payment Domain │  │ Notification   │
       │                │  │                │  │ Domain         │
       └───────┬────────┘  └───────┬────────┘  └───────┬────────┘
               │                   │                   │
               └───────────────────┼───────────────────┘
                                   ▼
                         ┌──────────────────────┐
                         │      Prisma          │
                         └──────────┬───────────┘
                                    ▼
                         ┌──────────────────────┐
                         │     PostgreSQL       │
                         └──────────────────────┘

External:
  Payment Provider
  Email Provider
  Object Storage
  Maps/Geocoding Provider
  Redis
```

---

# 4. Repository Structure

Recommended:

```text
src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── venues/
│   │   │   ├── page.tsx
│   │   │   └── [venueSlug]/
│   │   │       └── page.tsx
│   │   ├── sports/
│   │   └── cities/
│   │
│   ├── (customer)/
│   │   ├── bookings/
│   │   ├── checkout/
│   │   ├── profile/
│   │   └── favorites/
│   │
│   ├── dashboard/
│   │   ├── customer/
│   │   ├── venue/
│   │   └── admin/
│   │
│   ├── api/
│   │   ├── venues/
│   │   ├── availability/
│   │   ├── bookings/
│   │   ├── payments/
│   │   ├── coupons/
│   │   ├── reviews/
│   │   └── webhooks/
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── venue/
│   ├── booking/
│   ├── calendar/
│   ├── payments/
│   ├── dashboard/
│   └── forms/
│
├── server/
│   ├── domain/
│   │   ├── booking/
│   │   ├── availability/
│   │   ├── pricing/
│   │   ├── cancellation/
│   │   ├── rescheduling/
│   │   └── venue/
│   │
│   ├── services/
│   │   ├── payment/
│   │   ├── notification/
│   │   ├── refund/
│   │   └── storage/
│   │
│   ├── repositories/
│   └── policies/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── redis/
│   ├── validation/
│   ├── logging/
│   └── utils/
│
└── types/
```

Keep business logic out of React components.

---

# 5. Architectural Layers

## Presentation layer

Contains:

- Pages.
- Components.
- Forms.
- Client-side interaction.

Must not contain authoritative booking logic.

## API/application layer

Responsible for:

- Authentication.
- Authorization.
- Input validation.
- Calling domain services.
- Mapping domain results to API responses.

## Domain layer

Contains:

- Availability.
- Booking.
- Pricing.
- Cancellation.
- Rescheduling.
- Policy evaluation.

This is the most important layer.

## Repository layer

Handles database persistence.

Example:

```ts
interface BookingRepository {
  findConflictingBookings(input: ConflictQuery): Promise<Booking[]>;
  createHold(input: CreateHoldInput): Promise<BookingHold>;
  confirmBooking(id: string): Promise<Booking>;
  cancelBooking(id: string): Promise<Booking>;
}
```

---

# 6. Core Database Model

Use PostgreSQL.

Recommended entities:

```text
User
Role
Venue
VenueImage
VenueAmenity
Sport
VenueSport
Court
OperatingHour
OperatingHourException
PricingRule
BlockedSlot
Booking
BookingItem
BookingHold
Payment
PaymentAttempt
Refund
CancellationPolicy
CancellationPolicyRule
ReschedulePolicy
Coupon
CouponRedemption
Review
Notification
AuditLog
Favorite
```

Optional later:

```text
Membership
Wallet
WalletTransaction
Game
GameParticipant
Tournament
```

---

# 7. Prisma Model Design

Illustrative schema:

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  phone         String?   @unique
  passwordHash  String?
  role          UserRole  @default(CUSTOMER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  bookings      Booking[]
  reviews       Review[]
  auditLogs     AuditLog[]
}

enum UserRole {
  CUSTOMER
  VENUE_STAFF
  VENUE_MANAGER
  VENUE_OWNER
  PLATFORM_ADMIN
  SUPER_ADMIN
}

model Venue {
  id                    String   @id @default(cuid())
  name                  String
  slug                  String   @unique
  description           String?
  address               String
  city                  String
  locality              String?
  latitude              Decimal?
  longitude             Decimal?
  status                VenueStatus @default(DRAFT)
  timezone              String   @default("Asia/Kolkata")
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  courts                Court[]
  operatingHours        OperatingHour[]
  exceptions            OperatingHourException[]
  pricingRules          PricingRule[]
  blockedSlots          BlockedSlot[]
  bookings              Booking[]
  images                VenueImage[]
}

enum VenueStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  REJECTED
  SUSPENDED
  ARCHIVED
}

model Sport {
  id        String @id @default(cuid())
  name      String @unique
  slug      String @unique
  active    Boolean @default(true)
}

model Court {
  id          String @id @default(cuid())
  venueId     String
  sportId     String
  name        String
  capacity    Int @default(4)
  active      Boolean @default(true)

  venue       Venue @relation(fields: [venueId], references: [id])
  sport       Sport @relation(fields: [sportId], references: [id])

  bookings    BookingItem[]
  holds       BookingHold[]
  blockedSlots BlockedSlot[]

  @@index([venueId, active])
}

model Booking {
  id                String @id @default(cuid())
  bookingCode       String @unique
  userId            String
  venueId           String
  status            BookingStatus
  subtotal          Decimal
  discountAmount    Decimal @default(0)
  platformFee       Decimal @default(0)
  taxAmount         Decimal @default(0)
  totalAmount       Decimal
  currency          String @default("INR")

  priceSnapshot     Json
  policySnapshot    Json

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user              User @relation(fields: [userId], references: [id])
  venue             Venue @relation(fields: [venueId], references: [id])
  items             BookingItem[]
  payments          Payment[]
}

enum BookingStatus {
  HOLD
  PAYMENT_PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
  PAYMENT_FAILED
  EXPIRED
  RESCHEDULED
}

model BookingItem {
  id          String   @id @default(cuid())
  bookingId   String
  courtId     String
  startAt     DateTime
  endAt       DateTime
  unitPrice   Decimal
  totalPrice  Decimal

  booking     Booking @relation(fields: [bookingId], references: [id])
  court       Court   @relation(fields: [courtId], references: [id])

  @@index([courtId, startAt, endAt])
}

model BookingHold {
  id          String   @id @default(cuid())
  courtId     String
  bookingId   String?
  startAt     DateTime
  endAt       DateTime
  expiresAt   DateTime
  status      HoldStatus
  createdAt   DateTime @default(now())

  court       Court @relation(fields: [courtId], references: [id])

  @@index([courtId, startAt, endAt])
  @@index([expiresAt])
}

enum HoldStatus {
  ACTIVE
  CONVERTED
  EXPIRED
  RELEASED
}
```

The exact Prisma schema may be expanded during implementation.

---

# 8. Time Handling

All venue booking times must be timezone-aware.

Venue stores:

```text
timezone = Asia/Kolkata
```

Database timestamps should be stored in UTC.

UI displays timestamps in venue timezone.

Never compare raw local date strings in the database.

Example:

```text
User selects:
10 Oct 2026, 19:00 Asia/Kolkata

Convert to:
2026-10-10T13:30:00Z
```

---

# 9. Inventory Model

Do not model inventory only as a boolean.

A booking occupies an interval:

```text
courtId
startAt
endAt
```

Conflict exists when:

```text
existing.startAt < requested.endAt
AND
existing.endAt > requested.startAt
```

This supports:

```text
18:00–19:00
18:30–19:30
```

as conflicting.

---

# 10. PostgreSQL Double-Booking Protection

Application-level checking is not enough.

Use PostgreSQL transaction isolation and preferably an exclusion constraint over a range type where practical.

Conceptually:

```sql
EXCLUDE USING gist (
  court_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
```

Only active inventory should participate.

If Prisma's schema abstraction is insufficient for this constraint, add it through a SQL migration.

Alternative:

- Serializable transaction.
- Row/advisory lock.
- Conflict query.
- Insert.
- Retry serialization failure.

Preferred production implementation:

```text
Database constraint
+
transaction
+
idempotency
```

---

# 11. Booking Hold Algorithm

## Create hold

```text
BEGIN TRANSACTION

1. Validate user
2. Validate venue/court
3. Validate operating hours
4. Validate requested interval
5. Remove/expire stale holds
6. Check conflicting confirmed bookings
7. Check conflicting active holds
8. Insert hold
9. Insert booking in HOLD state
10. COMMIT
```

Then create payment order.

The hold expiry timestamp should be short, e.g.:

```text
5 minutes
```

and configurable.

---

# 12. Payment Confirmation Algorithm

Never confirm a booking merely because the browser says payment succeeded.

Flow:

```text
Payment provider
      ↓
Webhook
      ↓
Verify signature
      ↓
Find payment attempt
      ↓
Check idempotency
      ↓
BEGIN TRANSACTION
      ↓
Validate hold still valid
      ↓
Mark payment captured
      ↓
Convert booking to CONFIRMED
      ↓
Convert hold to CONVERTED
      ↓
COMMIT
      ↓
Send notification
```

If payment is valid but the hold expired, the system needs a reconciliation policy.

Preferred policy:

- Do not silently assign a different court.
- Put payment into an exception/refund workflow.
- Alert operations.
- Initiate refund according to configured policy.

---

# 13. Idempotency

All important mutation APIs should support an idempotency key.

Examples:

```http
Idempotency-Key: 01J...
```

Use it for:

- Create booking.
- Create payment order.
- Capture/confirm booking.
- Cancel booking.
- Reschedule.
- Refund.

Store:

```text
key
userId
operation
requestHash
response
createdAt
```

Repeated identical requests return the original result.

---

# 14. Availability Service

Create:

```ts
getAvailability({
  venueId,
  sportId,
  date,
  duration,
  startTime
})
```

Algorithm:

```text
1. Load venue timezone
2. Load operating hours
3. Apply date exceptions
4. Load active courts
5. Load pricing rules
6. Load confirmed bookings
7. Load active holds
8. Load blocked slots
9. Generate candidate intervals
10. Remove unavailable intervals
11. Calculate price
12. Return availability
```

Do not expose raw internal database structures directly to clients.

---

# 15. Pricing Service

Create:

```ts
calculatePrice({
  venueId,
  courtId,
  sportId,
  startAt,
  endAt,
  userId,
  couponCode
})
```

Output:

```ts
{
  subtotal,
  discount,
  platformFee,
  tax,
  total,
  currency,
  breakdown
}
```

The result must include a snapshot suitable for storing with the booking.

---

# 16. Pricing Rule Priority

Recommended precedence:

```text
Special date override
    ↓
Court-specific rule
    ↓
Sport-specific rule
    ↓
Venue-wide rule
    ↓
Default
```

If multiple rules overlap, use explicit priority.

Never rely on database insertion order.

---

# 17. Cancellation Service

Create:

```ts
evaluateCancellation(bookingId)
```

Returns:

```ts
{
  allowed: boolean,
  reason?: string,
  refundAmount: number,
  feeRetained: number
}
```

Cancellation must use the booking's stored policy snapshot where appropriate for historical correctness.

---

# 18. Rescheduling Service

Recommended transaction:

```text
BEGIN

1. Load current booking FOR UPDATE
2. Validate reschedule policy
3. Validate new slot
4. Acquire new inventory
5. Calculate price difference
6. Update booking/items
7. Release old inventory
8. Update reschedule count
9. COMMIT
```

If new inventory cannot be acquired:

```text
ROLLBACK
```

Old booking remains unchanged.

---

# 19. API Design

## Public

```http
GET /api/venues
GET /api/venues/:id
GET /api/venues/:id/availability
GET /api/sports
GET /api/amenities
```

## Customer

```http
POST /api/bookings/hold
POST /api/bookings
GET  /api/bookings
GET  /api/bookings/:id
POST /api/bookings/:id/cancel
POST /api/bookings/:id/reschedule
GET  /api/bookings/:id/invoice
POST /api/reviews
POST /api/coupons/validate
```

## Venue

```http
GET    /api/venue-manager/bookings
POST   /api/venue-manager/bookings/manual
PATCH  /api/venue-manager/courts/:id
POST   /api/venue-manager/blocked-slots
DELETE /api/venue-manager/blocked-slots/:id
POST   /api/venue-manager/pricing-rules
PATCH  /api/venue-manager/operating-hours
```

## Admin

```http
GET   /api/admin/users
GET   /api/admin/venues
PATCH /api/admin/venues/:id/status
GET   /api/admin/bookings
GET   /api/admin/payments
POST  /api/admin/refunds
GET   /api/admin/audit-logs
```

## Webhooks

```http
POST /api/webhooks/payment
```

---

# 20. Authorization

Use centralized authorization:

```ts
assertRole(user, [
  "VENUE_OWNER",
  "VENUE_MANAGER"
]);
```

Also check resource ownership.

Example:

A VENUE_MANAGER for Venue A must not be able to edit Venue B by changing the URL ID.

Authorization must verify:

```text
role
AND
resource ownership
AND
action permission
```

---

# 21. Server Actions vs Route Handlers

Use Server Actions for internal form mutations where appropriate.

Use Route Handlers for:

- Public APIs.
- Mobile clients later.
- Payment webhooks.
- Third-party integrations.
- Explicit API consumers.

Do not put complex booking logic directly inside a Server Action.

Both should call the same domain service.

---

# 22. Frontend Architecture

## Public pages

Server-render where possible:

```text
/
 /venues
 /venues/[slug]
 /cities/[city]
```

Use client components only for interactive pieces:

```text
DatePicker
SlotGrid
BookingSummary
Filters
```

## Booking UI

```text
Date
 ↓
Duration
 ↓
Court
 ↓
Time
 ↓
Price
 ↓
Checkout
```

Availability should refresh when:

- Date changes.
- Duration changes.
- Venue changes.
- Court selection changes.
- Window becomes stale.

---

# 23. Optimistic UI Rules

Do not optimistically mark a slot as permanently booked.

Client may show:

```text
Selecting...
Holding...
Payment pending...
```

But authoritative status comes from server.

After hold creation, frontend receives:

```json
{
  "holdId": "hold_123",
  "expiresAt": "..."
}
```

Show a countdown.

When expired:

```text
Checkout disabled
Release UI
Refresh availability
```

---

# 24. Redis Usage

Redis can be used for:

- Rate limiting.
- Availability caching.
- Session-adjacent temporary state if needed.
- Background job coordination.
- Distributed locks as a secondary mechanism.

Never treat Redis as the canonical booking database.

PostgreSQL remains authoritative.

---

# 25. Background Jobs

Some tasks should be asynchronous:

```text
Expire booking holds
Send notifications
Send reminders
Process refund updates
Generate reports
Cleanup temporary records
```

Possible infrastructure:

```text
Redis + BullMQ
```

or a managed job/queue provider.

---

# 26. Hold Expiry Job

Run frequently:

```text
Every 15–30 seconds
```

Find:

```text
ACTIVE holds
where expiresAt < now()
```

Then:

```text
mark EXPIRED
expire associated HOLD/PAYMENT_PENDING booking if applicable
```

Because expiry can race with payment:

- Payment confirmation and hold expiry must be transactionally coordinated.
- Never assume the background job is the only authority.

---

# 27. Caching

Cache public, relatively stable data:

```text
Venue details
Amenities
Sports
Venue images
Operating hours
```

Be cautious caching availability.

Recommended:

- Very short TTL.
- Cache key includes date/duration.
- Invalidate after booking/block/cancellation/reschedule.
- Always revalidate before hold creation.

Cached availability is only a UI optimization.

---

# 28. Search

MVP:

- PostgreSQL text search.
- Indexed city/locality/name fields.

Later:

- Elasticsearch/OpenSearch/Algolia.

Search should not be tightly coupled to booking.

---

# 29. Maps

Use a provider abstraction for:

- Geocoding.
- Map display.
- Distance.

Store:

```text
latitude
longitude
formatted address
```

Do not geocode on every page request.

---

# 30. Payments Architecture

Create:

```text
PaymentService
    ↓
PaymentProvider interface
    ↓
RazorpayProvider
```

Database:

```text
Payment
PaymentAttempt
Refund
```

Keep provider IDs.

Example:

```text
internalPaymentId
providerOrderId
providerPaymentId
providerRefundId
```

Never store card numbers, CVV, or sensitive payment credentials.

---

# 31. Notification Architecture

Create event-driven notification calls:

```text
BookingConfirmed
BookingCancelled
BookingRescheduled
PaymentFailed
RefundInitiated
RefundCompleted
BookingReminder
```

Domain emits event.

Notification worker processes it.

This avoids making booking confirmation depend on email provider latency.

---

# 32. Audit Architecture

Critical mutations create immutable audit records.

Example:

```json
{
  "actorId": "user_123",
  "action": "BOOKING_CANCELLED",
  "entityType": "BOOKING",
  "entityId": "booking_123",
  "metadata": {
    "refundAmount": 450,
    "reason": "CUSTOMER_REQUEST"
  }
}
```

Audit logs should be append-only from application perspective.

---

# 33. Error Model

Use consistent API errors:

```json
{
  "error": {
    "code": "SLOT_NO_LONGER_AVAILABLE",
    "message": "The selected slot is no longer available.",
    "requestId": "req_123"
  }
}
```

Suggested codes:

```text
AUTH_REQUIRED
FORBIDDEN
VENUE_NOT_FOUND
COURT_NOT_FOUND
INVALID_SLOT
SLOT_NO_LONGER_AVAILABLE
HOLD_EXPIRED
BOOKING_NOT_FOUND
BOOKING_NOT_CANCELLABLE
BOOKING_NOT_RESCHEDULABLE
PAYMENT_FAILED
PAYMENT_VERIFICATION_FAILED
REFUND_FAILED
INVALID_COUPON
RATE_LIMITED
```

Do not expose stack traces to users.

---

# 34. Observability

Use structured logging.

Every request should have:

```text
requestId
userId if authenticated
route
duration
status
```

Booking operations additionally log:

```text
bookingId
venueId
courtId
startAt
endAt
operation
```

Use error monitoring such as Sentry or equivalent.

---

# 35. Security Boundaries

Never expose:

- Database credentials.
- Payment secret keys.
- JWT secrets.
- Redis credentials.
- Storage secrets.

Environment variables:

```text
DATABASE_URL
REDIS_URL
AUTH_SECRET
PAYMENT_KEY_ID
PAYMENT_KEY_SECRET
PAYMENT_WEBHOOK_SECRET
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
EMAIL_API_KEY
```

Only public client-safe configuration may use `NEXT_PUBLIC_`.

---

# 36. Database Indexes

Important indexes:

```text
Venue(city, locality, status)
Court(venueId, active)
Booking(userId, createdAt)
Booking(venueId, status)
BookingItem(courtId, startAt, endAt)
BookingHold(courtId, expiresAt)
BlockedSlot(courtId, startAt, endAt)
PricingRule(venueId, priority)
Payment(bookingId)
Review(venueId)
```

Add indexes based on real query plans after load testing.

---

# 37. Testing Strategy

## Unit tests

Test:

- Price calculation.
- Availability generation.
- Cancellation policy.
- Rescheduling policy.
- Coupon rules.
- Slot overlap.
- Booking state transitions.

## Integration tests

Test:

- Booking transaction.
- Double booking.
- Hold expiry.
- Payment webhook.
- Refund.
- Rescheduling.
- Manual booking.

## End-to-end tests

Test:

```text
Sign up
→ Find venue
→ Select slot
→ Checkout
→ Payment sandbox
→ Confirmation
→ Cancel
→ Refund
```

## Critical concurrency test

Run two simultaneous booking requests for:

```text
Same venue
Same court
Same start
Same end
```

Expected:

```text
Exactly one succeeds.
Other receives SLOT_NO_LONGER_AVAILABLE.
```

This test is mandatory before production.

---

# 38. State Machines

## Booking

```text
HOLD
  ├── PAYMENT_PENDING
  │       ├── CONFIRMED
  │       ├── PAYMENT_FAILED
  │       └── EXPIRED
  └── EXPIRED

CONFIRMED
  ├── CANCELLED
  ├── RESCHEDULED
  └── COMPLETED
```

Invalid transitions must be rejected.

Example:

```text
CANCELLED → CONFIRMED
```

must never happen.

---

# 39. Booking State Transition Service

Create:

```ts
transitionBooking({
  bookingId,
  event
})
```

Events:

```text
PAYMENT_STARTED
PAYMENT_CONFIRMED
PAYMENT_FAILED
HOLD_EXPIRED
CUSTOMER_CANCELLED
ADMIN_CANCELLED
RESCHEDULED
MARK_COMPLETED
```

This prevents random route handlers from directly assigning statuses.

---

# 40. Financial Ledger Principle

Never calculate historical revenue from mutable current prices.

Booking stores immutable:

```text
subtotal
discount
fees
tax
total
currency
priceSnapshot
```

Payment stores actual transaction state.

Refund stores actual refunded amount.

Reports derive from these immutable financial records.

---

# 41. Manual Booking Rules

Manual bookings must use the same booking service:

```text
POST manual booking
      ↓
BookingService
      ↓
Inventory validation
      ↓
Create confirmed manual booking
```

Do not create manual bookings by directly inserting rows into `Booking` without inventory validation.

---

# 42. Multi-Tenant Venue Authorization

Venue ownership is a security boundary.

Every venue-management request must resolve:

```text
currentUser
    ↓
venueMembership
    ↓
venueId
    ↓
permission
```

Recommended model:

```text
VenueMember
- id
- venueId
- userId
- role
```

Roles:

```text
OWNER
MANAGER
STAFF
```

This is preferable to storing only one owner ID.

---

# 43. API Response Pagination

All list APIs should paginate.

Example:

```text
?page=1&pageSize=20
```

Maximum:

```text
pageSize = 100
```

Prefer cursor pagination for large booking lists.

---

# 44. File/Image Handling

Images should upload directly to object storage using signed URLs.

Flow:

```text
Browser
 ↓
Request upload URL
 ↓
Next.js
 ↓
Signed URL
 ↓
Object storage
 ↓
Save metadata
```

Do not send large image files through application servers unnecessarily.

---

# 45. Deployment

Recommended:

```text
Vercel
   │
   ├── Next.js
   │
   ├── Managed PostgreSQL
   │
   ├── Managed Redis
   │
   ├── Object Storage
   │
   └── Payment Provider
```

Database migrations should run in CI/CD.

Production migrations must be backward-compatible where possible.

---

# 46. Environment Separation

Maintain:

```text
development
staging
production
```

Each environment has separate:

- Database.
- Redis.
- Payment credentials.
- Storage bucket.
- Webhook endpoint.
- Email credentials.

Never use production payment credentials locally.

---

# 47. CI/CD

Pipeline:

```text
Pull Request
 ↓
Lint
 ↓
Typecheck
 ↓
Unit tests
 ↓
Integration tests
 ↓
Build
 ↓
Preview deployment
 ↓
Merge
 ↓
Staging
 ↓
Production
```

Required checks:

```text
npm run lint
npm run typecheck
npm test
npm run build
```

---

# 48. Coding Standards

- TypeScript strict mode.
- No `any` unless justified.
- Zod validation at external boundaries.
- No direct database calls from UI components.
- No payment logic in UI.
- No business rules duplicated between frontend and backend.
- Use domain service functions.
- Small composable functions.
- Explicit error types.
- Tests for business-critical behavior.

---

# 49. Suggested Service Interfaces

```ts
interface AvailabilityService {
  getAvailability(input: AvailabilityInput): Promise<AvailabilityResult>;
}

interface BookingService {
  createHold(input: CreateHoldInput): Promise<BookingHoldResult>;
  confirm(input: ConfirmBookingInput): Promise<BookingResult>;
  cancel(input: CancelBookingInput): Promise<CancelResult>;
  reschedule(input: RescheduleInput): Promise<RescheduleResult>;
}

interface PricingService {
  calculate(input: PricingInput): Promise<PricingResult>;
}

interface PolicyService {
  evaluateCancellation(input: CancellationInput): Promise<CancellationResult>;
  evaluateReschedule(input: ReschedulePolicyInput): Promise<ReschedulePolicyResult>;
}

interface PaymentService {
  createOrder(input: PaymentOrderInput): Promise<PaymentOrderResult>;
  verify(input: PaymentVerificationInput): Promise<PaymentVerificationResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}
```

---

# 50. Important Implementation Rule for Copilot

When generating code:

1. Do not generate the entire application in one file.
2. Do not place all business logic in `page.tsx`.
3. Do not trust frontend availability.
4. Do not confirm payment based only on client callback.
5. Do not use Redis as inventory truth.
6. Do not create permanent future slot rows unnecessarily.
7. Do not allow direct booking status mutation from arbitrary routes.
8. Do not bypass the BookingService for manual bookings.
9. Do not hard-code venue cancellation percentages.
10. Do not hard-code INR into the domain model even though MVP is India-first.
11. Do not copy Playo's visual assets, trademarks, proprietary code, or text.
12. Prefer transactional correctness over premature optimization.

---

# 51. Recommended Build Order

Copilot should implement in this order:

```text
01. Project foundation
02. Database + Prisma
03. Authentication
04. RBAC
05. Venue CRUD
06. Sports
07. Courts
08. Operating hours
09. Pricing rules
10. Blocked slots
11. Availability engine
12. Booking hold engine
13. Booking state machine
14. Payment abstraction
15. Razorpay integration
16. Payment webhook
17. Booking confirmation
18. Customer booking pages
19. Cancellation
20. Refund
21. Rescheduling
22. Manual bookings
23. Venue dashboard
24. Admin dashboard
25. Notifications
26. Reviews
27. Coupons
28. Reports
29. Concurrency testing
30. Production hardening
```

Do not start with advanced community features before the inventory/booking engine is proven correct.

---

# 52. Definition of Technically Done

The MVP backend is technically complete only when:

- Database migrations work from a clean database.
- Authentication works.
- RBAC works.
- Venue CRUD works.
- Court CRUD works.
- Pricing works.
- Availability works.
- Holds work.
- Booking transaction works.
- Double-booking concurrency test passes.
- Payment verification works.
- Webhook is idempotent.
- Cancellation works.
- Refund state is persisted.
- Rescheduling is transactional.
- Manual bookings share inventory.
- Audit logs work.
- Error handling is consistent.
- Unit/integration/E2E tests pass.
- Production environment variables are documented.
- Build and deployment succeed.

---

# 53. Future Service Extraction

Do not start with microservices.

Start as a modular monolith:

```text
Next.js
 ├── Booking domain
 ├── Venue domain
 ├── Payment domain
 ├── Pricing domain
 ├── Notification domain
 └── Admin domain
```

If scale requires extraction later:

```text
API Gateway
    │
    ├── Booking Service
    ├── Venue Service
    ├── Payment Service
    ├── Notification Service
    └── Search Service
```

The domain boundaries above make this possible without prematurely adding distributed-system complexity.

---

# 54. Reference Product Behavior

Public Playo documentation was reviewed for observable product behavior such as:

- Venue discovery.
- Hourly booking.
- Sport/time/duration/court selection.
- Online payment.
- Venue-specific cancellation policy.
- Venue-specific rescheduling rules.
- Venue availability.

The implementation should reproduce the underlying category of functionality with original code and product design. It must not copy proprietary Playo source code, branding, images, exact UI, or protected content.
