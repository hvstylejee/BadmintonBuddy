import { prisma } from "@/lib/prisma";
import { calculatePrice } from "@/server/domain/pricing/pricing.service";
import { ApiError } from "@/server/http";
import { z } from "zod";

const holdSchema = z.object({ venueId: z.string().min(1), courtId: z.string().min(1), startAt: z.string().datetime(), endAt: z.string().datetime(), couponCode: z.string().trim().toUpperCase().optional() });
const confirmSchema = z.object({ bookingId: z.string().min(1), holdId: z.string().min(1), paymentId: z.string().min(1) });
const overlaps = (startAt: Date, endAt: Date) => ({ startAt: { lt: endAt }, endAt: { gt: startAt } });

export async function createHold(userId: string, input: z.input<typeof holdSchema>) {
  const parsed = holdSchema.safeParse(input);
  if (!parsed.success) throw new ApiError("INVALID_SLOT", "Provide a valid future court time range.");
  const { venueId, courtId, startAt, endAt, couponCode } = parsed.data; const start = new Date(startAt); const end = new Date(endAt);
  if (start >= end || start <= new Date()) throw new ApiError("INVALID_SLOT", "Choose a future end time after the start time.");
  const price = await calculatePrice({ venueId, courtId, startAt, endAt, couponCode });
  return prisma.$transaction(async (tx) => {
    const court = await tx.court.findFirst({ where: { id: courtId, venueId, active: true }, include: { venue: true } });
    if (!court || court.venue.status !== "APPROVED") throw new ApiError("COURT_NOT_FOUND", "That court is unavailable.", 404);
    const [bookingConflict, holdConflict, blocked] = await Promise.all([
      tx.bookingItem.findFirst({ where: { courtId, ...overlaps(start, end), booking: { status: { in: ["CONFIRMED", "PAYMENT_PENDING"] } } } }),
      tx.bookingHold.findFirst({ where: { courtId, status: "ACTIVE", expiresAt: { gt: new Date() }, ...overlaps(start, end) } }),
      tx.blockedSlot.findFirst({ where: { OR: [{ courtId }, { courtId: null }], ...overlaps(start, end) } }),
    ]);
    if (bookingConflict || holdConflict || blocked) throw new ApiError("SLOT_NO_LONGER_AVAILABLE", "That slot was just taken. Pick another time.", 409);
    const booking = await tx.booking.create({ data: { bookingCode: `BB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, userId, venueId, status: "HOLD", subtotal: price.subtotal, discountAmount: price.discount, platformFee: price.platformFee, taxAmount: price.tax, totalAmount: price.total, currency: price.currency, priceSnapshot: price, policySnapshot: {} } });
    const hold = await tx.bookingHold.create({ data: { courtId, bookingId: booking.id, startAt: start, endAt: end, expiresAt: new Date(Date.now() + 5 * 60_000), status: "ACTIVE" } });
    await tx.bookingItem.create({ data: { bookingId: booking.id, courtId, startAt: start, endAt: end, unitPrice: price.subtotal, totalPrice: price.subtotal } });
    return { bookingId: booking.id, bookingCode: booking.bookingCode, holdId: hold.id, expiresAt: hold.expiresAt.toISOString(), status: booking.status, price };
  });
}

export async function confirmBooking(userId: string, input: z.input<typeof confirmSchema>) {
  const parsed = confirmSchema.safeParse(input); if (!parsed.success) throw new ApiError("INVALID_PAYMENT", "Invalid booking confirmation.");
  const { bookingId, holdId, paymentId } = parsed.data;
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({ where: { id: bookingId, userId, status: "HOLD" } });
    if (!booking) throw new ApiError("BOOKING_NOT_FOUND", "Booking hold not found.", 404);
    const hold = await tx.bookingHold.findFirst({ where: { id: holdId, bookingId, status: "ACTIVE" } });
    if (!hold || hold.expiresAt <= new Date()) { if (hold) await tx.bookingHold.update({ where: { id: hold.id }, data: { status: "EXPIRED" } }); throw new ApiError("HOLD_EXPIRED", "Your hold has expired. Please choose a slot again.", 409); }
    // Payment providers must call this only after signature/webhook verification.
    await tx.payment.create({ data: { bookingId, userId, amount: booking.totalAmount, currency: booking.currency, provider: "razorpay", providerOrderId: paymentId, providerPaymentId: paymentId, status: "CAPTURED", gatewayResponse: {} } });
    await tx.bookingHold.update({ where: { id: hold.id }, data: { status: "CONVERTED" } });
    const confirmed = await tx.booking.update({ where: { id: bookingId }, data: { status: "CONFIRMED" } });
    return { bookingId: confirmed.id, bookingCode: confirmed.bookingCode, status: confirmed.status, total: Number(confirmed.totalAmount.toString()) };
  });
}
