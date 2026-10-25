# Badminton Court Booking Platform — Product Requirements Document

**Document:** PRD  
**Version:** 1.0  
**Status:** Implementation-ready  
**Target stack:** Next.js + TypeScript  
**Primary use case:** Online badminton court discovery, scheduling, booking, payment, cancellation/rescheduling, and venue management  
**Product type:** Multi-venue sports booking SaaS/marketplace

---

## 1. Executive Summary

Build a web-first badminton court booking platform inspired by the functional model of Playo, but with original branding, UI, business rules, code, and content.

The product connects:

1. **Players** who want to discover and book badminton courts.
2. **Venue owners/managers** who want to publish courts, pricing, availability, policies, and manage bookings.
3. **Platform administrators** who manage venues, users, payments, disputes, promotions, and platform configuration.

The core product promise is:

> A player can find a badminton venue, see trustworthy real-time availability and pricing, select a court/time, pay online, and immediately receive a confirmed booking.

The most important technical/business requirement is **booking correctness**. Two customers must never be able to successfully purchase the same court/time inventory.

The system must support venue-specific operating hours, court inventory, pricing rules, blocked slots, booking holds, online payments, cancellation/refund rules, rescheduling, notifications, invoices, reviews, and admin reporting.

Playo's public booking documentation describes a flow of finding a venue, selecting hourly booking, sport, time, duration and court, then proceeding to payment. Its support documentation also indicates venue-specific cancellation and rescheduling policies. These behaviors are treated as product references, not as implementation or UI copying.

---

# 2. Goals

## 2.1 Primary goals

- Allow users to discover badminton venues.
- Show venue details, amenities, photos, rules, ratings, pricing, and availability.
- Allow users to select a date, duration, court, and time.
- Prevent double booking.
- Temporarily hold inventory during checkout.
- Process online payments securely.
- Confirm bookings only after verified payment.
- Allow eligible cancellation and refunds.
- Allow eligible rescheduling.
- Give venue owners complete control over courts, schedules, pricing, blocks, and bookings.
- Give administrators complete platform-level control.
- Provide an auditable history for booking/payment state changes.
- Make the system extensible to additional sports later.

## 2.2 Secondary goals

- Coupons/promotions.
- Memberships.
- Wallet/credits.
- Reviews and ratings.
- Notifications.
- Revenue analytics.
- Player/game/community features.
- Corporate/bulk bookings.
- Multi-sport support.

---

# 3. Non-Goals for MVP

Do NOT make these mandatory for the first release:

- Native iOS application.
- Native Android application.
- Social feed.
- Advanced player matchmaking.
- Tournament management.
- Coaching marketplace.
- Live chat.
- AI recommendations.
- Complex loyalty system.
- Multi-country tax/payment configuration.
- International currencies.

The architecture should allow these later without rewriting the booking engine.

---

# 4. Target Users

## 4.1 Player / Customer

Needs to:

- Find nearby venues.
- Compare price and availability.
- Select a suitable slot.
- Pay.
- Receive confirmation.
- View booking history.
- Cancel/reschedule according to venue policy.
- View invoice.
- Review venue.

## 4.2 Venue Owner

Needs to:

- Create/manage venue profile.
- Add courts.
- Configure operating hours.
- Configure pricing.
- Block courts.
- See bookings.
- Create manual/offline bookings.
- Cancel bookings when necessary.
- Configure cancellation/reschedule policy.
- View revenue and utilization.

## 4.3 Venue Staff

Needs limited operational access:

- View today's bookings.
- Check customers in.
- Create/manual bookings if permitted.
- Block/unblock slots if authorized.
- View court schedule.

## 4.4 Platform Admin

Needs:

- Full venue management.
- User management.
- Booking management.
- Payment/refund visibility.
- Coupon management.
- Dispute handling.
- Reports.
- Audit logs.
- Configuration.

---

# 5. Core User Journey

## 5.1 Customer booking journey

```text
Landing page
    ↓
Search / location
    ↓
Sport = Badminton
    ↓
Select date
    ↓
Browse venues
    ↓
Open venue
    ↓
View courts + price + availability
    ↓
Select date/time/duration/court
    ↓
Review booking
    ↓
Apply coupon (optional)
    ↓
Create temporary booking hold
    ↓
Payment
    ↓
Payment verification
    ↓
Booking confirmed
    ↓
Confirmation page + notification + invoice
```

## 5.2 Venue management journey

```text
Venue owner login
    ↓
Dashboard
    ↓
Venue setup
    ↓
Add courts
    ↓
Configure hours
    ↓
Configure pricing
    ↓
Publish venue
    ↓
Manage live calendar
    ↓
Receive bookings
    ↓
View revenue/utilization
```

---

# 6. MVP Functional Requirements

## 6.1 Authentication

### Requirements

- Email/password authentication OR phone OTP.
- Session-based authentication.
- Secure password hashing if passwords are enabled.
- Role-based access control.
- Logout.
- Account profile.
- Basic account deletion flow.

### Roles

```text
CUSTOMER
VENUE_STAFF
VENUE_MANAGER
VENUE_OWNER
PLATFORM_ADMIN
SUPER_ADMIN
```

---

# 7. Venue Discovery

## 7.1 Venue listing

Users can browse venues using:

- Location/city.
- Area/locality.
- Date.
- Time.
- Duration.
- Price range.
- Rating.
- Amenities.
- Distance.
- Availability.
- Sport.

### Venue card

Show:

- Venue name.
- Primary image.
- Rating.
- Number of reviews.
- Locality.
- Starting price.
- Available time indicator.
- Selected sport.
- Important amenities.
- Distance where location is available.

## 7.2 Search

Search should support:

- Venue name.
- Locality.
- Area.
- City.

Future:

- Geolocation.
- Map search.
- Radius search.

## 7.3 Filters

MVP:

- Price.
- Rating.
- Available now / selected time.
- Amenities.
- Distance.

---

# 8. Venue Details

Each venue should contain:

### Basic information

- Name.
- Description.
- Address.
- Latitude.
- Longitude.
- Contact information.
- Opening/closing hours.
- Sports offered.
- Images.
- Amenities.
- Rules.
- Booking policy.

### Badminton information

- Number of courts.
- Court names/numbers.
- Court type if applicable.
- Flooring type.
- Indoor/outdoor.
- Lighting.
- Maximum players per court.
- Equipment rentals.
- Venue-specific restrictions.

### Booking information

- Starting price.
- Current selected-slot price.
- Minimum duration.
- Maximum duration.
- Advance booking window.
- Cancellation policy.
- Rescheduling policy.
- No-show policy.

---

# 9. Court Management

A venue can have multiple courts.

Example:

```text
Venue
 ├── Court 1
 ├── Court 2
 ├── Court 3
 └── Court 4
```

Each court has:

- ID.
- Name.
- Sport.
- Active/inactive status.
- Capacity.
- Operating schedule.
- Pricing rules.
- Optional features.
- Maintenance/block status.

A court can be disabled without deleting historical bookings.

---

# 10. Operating Hours

Venue owners configure:

- Day of week.
- Opening time.
- Closing time.
- Break periods.
- Special holiday hours.

Example:

```text
Monday
06:00 → 23:00

Tuesday
06:00 → 23:00

Sunday
07:00 → 22:00
```

Special date overrides must be supported.

Example:

```text
2026-10-20
Closed
Reason: Maintenance
```

---

# 11. Slot Model

The platform should NOT rely on a permanently pre-created database row for every future time slot.

Availability should be derived from:

```text
Operating Hours
+ Court
+ Pricing Rules
+ Existing Bookings
+ Active Holds
+ Blocked Slots
+ Exceptions
```

The API generates available slot intervals.

For MVP, support configurable slot granularity, default:

```text
30 minutes
```

A venue may choose:

```text
30 minutes
60 minutes
```

The booking engine must support bookings spanning multiple contiguous intervals.

Example:

```text
18:00–19:00
19:00–20:00
```

A 2-hour booking consumes both intervals.

---

# 12. Availability

## 12.1 Statuses

Each requested court/time interval can be:

```text
AVAILABLE
HELD
BOOKED
BLOCKED
CLOSED
PAST
```

## 12.2 Availability API

The customer frontend must never decide availability by itself.

The server is authoritative.

Example response:

```json
{
  "date": "2026-10-10",
  "venueId": "venue_123",
  "courts": [
    {
      "courtId": "court_1",
      "courtName": "Court 1",
      "slots": [
        {
          "start": "18:00",
          "end": "19:00",
          "status": "AVAILABLE",
          "price": 500
        },
        {
          "start": "19:00",
          "end": "20:00",
          "status": "BOOKED",
          "price": 500
        }
      ]
    }
  ]
}
```

---

# 13. Booking Engine

This is the highest-priority subsystem.

## 13.1 Booking lifecycle

```text
DRAFT
  ↓
HOLD_CREATED
  ↓
PAYMENT_PENDING
  ↓
CONFIRMED
```

Failure paths:

```text
HOLD_CREATED → EXPIRED
PAYMENT_PENDING → PAYMENT_FAILED
PAYMENT_PENDING → EXPIRED
CONFIRMED → CANCELLED
CONFIRMED → COMPLETED
CONFIRMED → RESCHEDULED
```

## 13.2 Temporary hold

When a user proceeds to checkout:

1. Server validates slot availability.
2. Server creates an inventory hold.
3. Hold gets an expiry timestamp.
4. Payment order is created.
5. User completes payment.
6. Payment webhook verifies payment.
7. Booking becomes confirmed.

Default hold duration:

```text
5 minutes
```

Make this configurable.

## 13.3 Double-booking protection

The system MUST guarantee:

> Two successful bookings cannot occupy the same court and overlapping time range.

This must be enforced server-side and at the database transaction/constraint level.

Never rely on:

```text
if (slot.available) {
   createBooking()
}
```

without transactional protection.

---

# 14. Booking Rules

### Required validations

Before creating a hold:

- User authenticated.
- Venue active.
- Court active.
- Sport supported.
- Date valid.
- Time valid.
- Court belongs to venue.
- Court supports sport.
- Slot is inside operating hours.
- Slot isn't in the past.
- Slot satisfies advance-booking rule.
- Slot isn't blocked.
- No conflicting booking exists.
- No conflicting hold exists.
- Duration is valid.
- Capacity rule is satisfied.
- Price is calculated server-side.

---

# 15. Price Calculation

Price must always be calculated on the server.

Example pricing rules:

```text
Weekday
06:00–09:00 = ₹250/hour
09:00–17:00 = ₹300/hour
17:00–22:00 = ₹500/hour
```

The price engine should support:

- Day of week.
- Time range.
- Court.
- Sport.
- Holiday.
- Peak pricing.
- Off-peak pricing.
- Special date.
- Customer membership.
- Coupon discount.
- Platform fee.
- Tax.

Store a price snapshot in the booking.

Historical bookings must not change price if the venue later changes its pricing rules.

---

# 16. Checkout

Checkout must display:

- Venue.
- Court.
- Date.
- Start time.
- End time.
- Duration.
- Base price.
- Discount.
- Platform/convenience fee.
- Tax if applicable.
- Final amount.
- Cancellation policy.
- Rescheduling policy.
- Terms acceptance.

Example:

```text
Court 2
10 Oct 2026
7:00 PM – 8:00 PM

Court fee          ₹500
Convenience fee     ₹20
Discount            ₹50
-----------------------
Total              ₹470
```

The UI must clearly show that the final price is server-calculated.

---

# 17. Payments

For India-first MVP:

- Razorpay or equivalent payment provider.
- Payment order created server-side.
- Never trust client payment success.
- Verify payment signature/webhook.
- Use idempotency.
- Record provider transaction IDs.
- Record payment attempts.
- Support refund state.

Payment states:

```text
CREATED
PENDING
AUTHORIZED
CAPTURED
FAILED
REFUND_PENDING
PARTIALLY_REFUNDED
REFUNDED
```

Booking confirmation should be based on trusted payment verification.

---

# 18. Cancellation

Cancellation is policy-driven.

Venue owners configure:

```text
Cancellation allowed until X hours before start.
```

Possible refund rules:

```text
> 24h     → 100%
12–24h    → 75%
4–12h     → 50%
< 4h      → 0%
```

The platform must not hard-code these percentages.

The policy engine evaluates the venue's configured rules.

Cancellation must:

1. Validate eligibility.
2. Calculate refund.
3. Mark booking cancelled.
4. Release inventory.
5. Initiate refund if applicable.
6. Record policy decision.
7. Notify customer and venue.

Any platform/convenience fee refundability must be separately configurable.

---

# 19. Rescheduling

Rescheduling is venue-policy dependent.

Configurable:

- Whether rescheduling is allowed.
- Number of allowed reschedules.
- Minimum hours before start.
- Same venue only or broader scope.
- Same duration requirement.
- Price difference behavior.

Suggested MVP:

```text
Same venue
Same sport
Same duration
New slot must be available
Venue policy must allow it
```

When rescheduling:

1. Validate current booking.
2. Validate policy.
3. Hold new slot.
4. Calculate price difference.
5. Confirm new slot transactionally.
6. Release old slot.
7. Update booking history.
8. Handle additional payment/refund if necessary.

Never release the old booking before the new inventory is safely acquired.

---

# 20. Manual / Offline Bookings

Venue staff should be able to create a booking for walk-in/phone customers.

Required:

- Customer name/phone optional.
- Court.
- Date.
- Time.
- Duration.
- Amount.
- Payment method:
  - CASH
  - UPI_OFFLINE
  - OTHER
- Notes.

Manual bookings must consume the same inventory as online bookings.

This prevents online customers from booking a court already sold offline.

---

# 21. Court Blocking

Venue staff can block inventory for:

- Maintenance.
- Cleaning.
- Private event.
- Tournament.
- Staff use.
- Other reason.

Block fields:

```text
court
start
end
reason
createdBy
createdAt
```

Blocked inventory must appear unavailable to customers.

---

# 22. Booking Management

Customer booking detail:

- Booking ID.
- Status.
- Venue.
- Address.
- Court.
- Date.
- Time.
- Duration.
- Amount.
- Payment status.
- Cancellation policy.
- Reschedule policy.
- Invoice.
- QR/booking code if implemented.
- Contact venue.
- Cancel.
- Reschedule.

Customer tabs:

```text
Upcoming
Past
Cancelled
```

---

# 23. Reviews

After a completed booking:

- Rating: 1–5.
- Written review optional.
- One review per eligible booking.
- Venue can respond.
- Admin can moderate.

Review eligibility should require a completed booking.

---

# 24. Notifications

Channels:

- In-app.
- Email.
- Optional SMS/WhatsApp integration later.

Events:

- Booking confirmed.
- Payment failed.
- Hold expiring.
- Booking cancelled.
- Refund initiated.
- Refund completed.
- Reschedule confirmed.
- Venue cancelled booking.
- Reminder before booking.
- Review request.

Notification records should be persisted.

---

# 25. Customer Dashboard

Sections:

```text
Profile
Upcoming Bookings
Past Bookings
Cancelled Bookings
Favorites
Payments/Invoices
Reviews
Notifications
Settings
```

---

# 26. Venue Dashboard

Dashboard metrics:

- Today's bookings.
- Today's revenue.
- Upcoming bookings.
- Occupancy percentage.
- Court utilization.
- Cancellation count.
- Refund amount.
- Revenue by day.
- Revenue by court.

Calendar:

```text
Date
  ↓
Court rows
  ↓
Time columns
```

Example:

```text
        6  7  8  9  10 11 12
Court1  ✓  ✓  B  B  ✓  ✓  X
Court2  ✓  H  ✓  ✓  ✓  B  B
Court3  X  X  ✓  ✓  H  ✓  ✓
```

Legend:

```text
✓ Available
H Held
B Booked
X Blocked/closed
```

---

# 27. Venue Configuration

Venue manager can configure:

- Name.
- Description.
- Address.
- Coordinates.
- Images.
- Amenities.
- Rules.
- Sports.
- Courts.
- Operating hours.
- Holidays.
- Pricing.
- Cancellation rules.
- Rescheduling rules.
- Advance booking window.
- Minimum/maximum duration.
- Booking buffer.
- Customer capacity.

---

# 28. Admin Dashboard

Admin areas:

```text
Overview
Users
Venues
Venue approvals
Bookings
Payments
Refunds
Coupons
Reviews
Reports
Notifications
Audit logs
System settings
```

---

# 29. Venue Approval

New venue should initially be:

```text
DRAFT
```

Possible statuses:

```text
DRAFT
PENDING_REVIEW
APPROVED
REJECTED
SUSPENDED
ARCHIVED
```

Only APPROVED + ACTIVE venues appear publicly.

---

# 30. Coupons

Coupon fields:

- Code.
- Type:
  - percentage
  - fixed
- Amount.
- Minimum booking amount.
- Maximum discount.
- Start/end date.
- Usage limit.
- Per-user usage limit.
- Applicable venues.
- Applicable sports.
- Active status.

Coupon validation must occur server-side.

---

# 31. Audit Logging

Audit important actions:

- Login.
- Venue creation.
- Venue approval.
- Court changes.
- Pricing changes.
- Booking creation.
- Booking cancellation.
- Rescheduling.
- Manual booking.
- Refund.
- Coupon changes.
- Role changes.

Audit event:

```text
actor
action
entityType
entityId
oldValue
newValue
timestamp
ip/userAgent where appropriate
```

Do not store sensitive payment credentials.

---

# 32. Security Requirements

- HTTPS only in production.
- Secure cookies.
- CSRF protection where relevant.
- Server-side authorization on every protected action.
- Input validation with Zod or equivalent.
- SQL injection protection through Prisma parameterization.
- Rate limiting.
- Brute-force protection for OTP/login.
- Webhook signature verification.
- Idempotency keys for payment/booking operations.
- No secrets in client-side code.
- No sensitive information in logs.
- Least-privilege database access.
- Audit sensitive admin actions.

---

# 33. Non-Functional Requirements

## Performance

Target:

- Public pages: fast initial load.
- Availability API: p95 under 500 ms under normal load.
- Booking hold: p95 under 500 ms excluding payment provider.
- Booking confirmation: near real-time after payment webhook.

## Availability

Target MVP:

- 99.9% application availability.

## Consistency

Booking inventory must prioritize correctness over eventual consistency.

## Scalability

Architecture should support:

- Multiple cities.
- Thousands of venues.
- Tens of thousands of courts.
- High concurrent booking traffic.

---

# 34. SEO

Public pages should be indexable:

- Venue pages.
- City pages.
- Area pages.
- Sport pages.

Use:

- Next.js metadata.
- Structured data where appropriate.
- Canonical URLs.
- Sitemap.
- Robots rules.

Authenticated pages should not be indexed.

---

# 35. Accessibility

Target WCAG 2.1 AA principles:

- Keyboard navigation.
- Accessible labels.
- Focus states.
- Sufficient contrast.
- Screen-reader compatible controls.
- Error messages.
- Accessible calendar/slot selection.

---

# 36. Analytics

Track:

```text
venue_viewed
search_performed
availability_viewed
slot_selected
checkout_started
payment_started
payment_success
payment_failed
booking_confirmed
booking_cancelled
booking_rescheduled
coupon_applied
review_submitted
```

Do not collect unnecessary personal data.

---

# 37. MVP Acceptance Criteria

A release is considered MVP-complete when:

1. A customer can create an account.
2. Customer can find a venue.
3. Customer can view venue details.
4. Customer can view availability.
5. Customer can select a court/time/duration.
6. Server calculates final price.
7. System places a temporary hold.
8. Customer can pay.
9. Payment is verified server-side.
10. Booking becomes confirmed.
11. Same court/time cannot be booked twice.
12. Customer receives confirmation.
13. Customer can view booking.
14. Eligible cancellation works.
15. Eligible refund is recorded.
16. Eligible rescheduling works.
17. Venue owner can manage courts.
18. Venue owner can manage pricing.
19. Venue owner can block slots.
20. Venue owner can see bookings.
21. Staff can create manual bookings.
22. Manual bookings consume online inventory.
23. Admin can manage venues/users/bookings.
24. Audit logs exist for critical operations.

---

# 38. Suggested Release Phases

## Phase 1 — Foundation

- Next.js setup.
- Database.
- Auth.
- RBAC.
- Base UI.
- Venue CRUD.

## Phase 2 — Inventory

- Courts.
- Operating hours.
- Pricing.
- Availability.
- Blocks.

## Phase 3 — Booking

- Holds.
- Booking transactions.
- Checkout.
- Payment.
- Confirmation.

## Phase 4 — Post-booking

- Cancellation.
- Refund.
- Rescheduling.
- Notifications.
- Invoices.

## Phase 5 — Operations

- Venue dashboard.
- Manual bookings.
- Reports.
- Admin.

## Phase 6 — Growth

- Coupons.
- Reviews.
- Memberships.
- Favorites.
- Community/game features.

---

# 39. Important Product Principles

1. **Server is authoritative for availability.**
2. **Never trust the client for price or payment state.**
3. **Never release inventory before a replacement slot is safely acquired during rescheduling.**
4. **Every payment webhook must be idempotent.**
5. **Every booking mutation must be auditable.**
6. **Historical bookings store immutable price/policy snapshots.**
7. **Manual/offline bookings use the same inventory engine as online bookings.**
8. **Venue policies are configuration, not hard-coded business logic.**
9. **Use original UI/branding rather than copying Playo's proprietary assets.**
10. **Build the booking engine as a reusable domain module so additional sports can be added later.**

---

# 40. Reference Behavior

The product behavior is informed by publicly documented Playo functionality, including:

- Venue discovery and booking.
- Hourly venue booking.
- Sport/time/duration/court selection.
- Online payment.
- Venue-specific cancellation policies.
- Venue-specific rescheduling rules.
- Venue calendars and availability concepts.

These references describe observable product behavior only. They are not requirements to copy Playo's proprietary code, visual design, trademarks, assets, or internal architecture.
