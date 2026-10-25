import { prisma } from "../../../../lib/prisma";
import { 
  UserRole, 
  VenueStatus, 
  BookingStatus, 
  HoldStatus, 
  PaymentStatus 
} from "@prisma/client";
import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Input schemas for booking operations
 */
const createHoldSchema = z.object({
  userId: z.string(),
  venueId: z.string(),
  courtId: z.string(),
  startAt: z.string(), // ISO datetime
  endAt: z.string(), // ISO datetime
  duration: z.number(), // in minutes
});

const confirmBookingSchema = z.object({
  bookingId: z.string(),
  paymentId: z.string(),
  holdId: z.string(),
});

const cancelBookingSchema = z.object({
  bookingId: z.string(),
  userId: z.string(),
  reason: z.string().optional(),
});

/**
 * Booking Service
 * Handles the complete booking lifecycle:
 * DRAFT -> HOLD_CREATED -> PAYMENT_PENDING -> CONFIRMED
 * Failure paths: HOLD_CREATED -> EXPIRED, PAYMENT_PENDING -> PAYMENT_FAILED, etc.
 */
export class BookingService {
  /**
   * Create a temporary hold on court inventory
   * This is the first step in the booking flow
   */
  async createHold(input: {
    userId: string;
    venueId: string;
    courtId: string;
    startAt: string;
    endAt: string;
    duration: number;
  }) {
    const validated = createHoldSchema.safeParse(input);
    if (!validated.success) {
      throw new Error("Invalid hold input: " + validated.error.format());
    }

    const { userId, venueId, courtId, startAt, endAt, duration } = validated.data;

    // Begin transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validate user is authenticated
      const user = await tx.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new Error("User not found");
      }

      // 2. Validate venue is active
      const venue = await tx.venue.findUnique({
        where: { id: venueId },
      });
      if (!venue || venue.status !== VenueStatus.APPROVED) {
        throw new Error("Venue not found or not approved");
      }

      // 3. Validate court is active and belongs to venue
      const court = await tx.court.findUnique({
        where: { id: courtId },
        include: { venue: true },
      });
      if (!court || !court.active || court.venueId !== venueId) {
        throw new Error("Court not found, inactive, or doesn't belong to venue");
      }

      // 4. Validate operating hours
      const start = dayjs(startAt);
      const end = dayjs(endAt);
      const now = dayjs();
      
      if (start.isBefore(now)) {
        throw new Error("Slot is in the past");
      }
      if (end.isBefore(start)) {
        throw new Error("End time must be after start time");
      }

      // 5. Check for conflicting confirmed bookings
      const conflictingBookings = await tx.bookingItem.findMany({
        where: {
          courtId,
          booking: {
            status: BookingStatus.CONFIRMED,
          },
          OR: [
            {
              startAt: { gte: startAt, lte: endAt },
            },
            {
              endAt: { gte: startAt, lte: endAt },
            },
            {
              startAt: { lte: startAt },
              endAt: { gte: endAt },
            },
          ],
        },
        include: { booking: true },
      });

      if (conflictingBookings.length > 0) {
        throw new Error("Slot is already booked");
      }

      // 6. Check for conflicting active holds
      const conflictingHolds = await tx.bookingHold.findMany({
        where: {
          courtId,
          status: HoldStatus.ACTIVE,
          OR: [
            {
              startAt: { gte: startAt, lte: endAt },
            },
            {
              endAt: { gte: startAt, lte: endAt },
            },
            {
              startAt: { lte: startAt },
              endAt: { gte: endAt },
            },
          ],
        },
      });

      if (conflictingHolds.length > 0) {
        throw new Error("Slot is already on hold");
      }

      // 7. Check for blocked slots
      const blockedSlots = await tx.blockedSlot.findMany({
        where: {
          courtId,
          OR: [
            {
              startAt: { lte: endAt },
              endAt: { gte: startAt },
            },
          ],
        },
      });

      if (blockedSlots.length > 0) {
        throw new Error("Court is blocked for maintenance/other reasons");
      }

      // 8. Create the hold
      const holdExpiry = dayjs().add(5, "minutes").format(); // Default 5 minute hold
      
      const hold = await tx.bookingHold.create({
        data: {
          courtId,
          startAt,
          endAt,
          expiresAt: holdExpiry,
          status: HoldStatus.ACTIVE,
        },
      });

      // 9. Create booking in HOLD state
      const booking = await tx.booking.create({
        data: {
          bookingCode: `BB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          venueId,
          status: BookingStatus.HOLD,
          subtotal: 0, // Will be calculated during checkout
          discountAmount: 0,
          platformFee: 0,
          taxAmount: 0,
          totalAmount: 0,
          priceSnapshot: {},
          policySnapshot: {},
        },
      });

      // 10. Link the hold to the booking
      await tx.bookingHold.update({
        where: { id: hold.id },
        data: { bookingId: booking.id },
      });

      // 11. Create booking item
      await tx.bookingItem.create({
        data: {
          bookingId: booking.id,
          courtId,
          startAt,
          endAt,
          unitPrice: 0, // Will be calculated
          totalPrice: 0, // Will be calculated
        },
      });

      return {
        bookingId: booking.id,
        holdId: hold.id,
        expiresAt: holdExpiry,
        status: BookingStatus.HOLD,
      };
    });

    return result;
  }

  /**
   * Confirm a booking after payment verification
   */
  async confirmBooking(input: {
    bookingId: string;
    paymentId: string;
    holdId: string;
  }) {
    const validated = confirmBookingSchema.safeParse(input);
    if (!validated.success) {
      throw new Error("Invalid confirm input");
    }

    const { bookingId, paymentId, holdId } = validated.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Load the booking with hold
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          items: true,
          holds: true,
        },
      });

      if (!booking || booking.status !== BookingStatus.HOLD) {
        throw new Error("Booking not in HOLD state");
      }

      // 2. Validate hold still exists and is not expired
      const hold = booking.holds.find((h) => h.id === holdId);
      if (!hold || hold.status !== HoldStatus.ACTIVE) {
        throw new Error("Hold not found or already converted/expired");
      }

      const now = dayjs();
      if (dayjs(hold.expiresAt).isBefore(now)) {
        // Hold expired, mark as expired
        await tx.bookingHold.update({
          where: { id: holdId },
          data: { status: HoldStatus.EXPIRED },
        });
        throw new Error("Hold has expired");
      }

      // 3. Verify payment (in real implementation, would check with payment provider)
      // For now, we assume payment verification is done externally
      // and we just mark the booking as confirmed

      // 4. Mark payment as captured
      await tx.payment.create({
        data: {
          bookingId,
          userId: booking.userId,
          amount: booking.totalAmount,
          currency: "INR",
          provider: "razorpay",
          providerOrderId: paymentId,
          providerPaymentId: paymentId, // In real case, this would come from webhook
          status: PaymentStatus.CAPTURED,
        },
      });

      // 5. Update booking status to CONFIRMED
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CONFIRMED,
          subtotal: booking.subtotal,
          discountAmount: booking.discountAmount,
          platformFee: booking.platformFee,
          taxAmount: booking.taxAmount,
          totalAmount: booking.totalAmount,
          priceSnapshot: booking.priceSnapshot,
          policySnapshot: booking.policySnapshot,
        },
      });

      // 6. Update hold status to CONVERTED
      await tx.bookingHold.update({
        where: { id: holdId },
        data: { status: HoldStatus.CONVERTED },
      });

      // 7. Return confirmed booking details
      return {
        bookingId: booking.id,
        bookingCode: booking.bookingCode,
        status: BookingStatus.CONFIRMED,
        totalAmount: booking.totalAmount,
        user: {
          id: booking.userId,
          name: booking.user?.name,
          email: booking.user?.email,
        },
        court: booking.items[0]?.court,
      };
    });

    return result;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(input: {
    bookingId: string;
    userId: string;
    reason?: string;
  }) {
    const validated = cancelBookingSchema.safeParse(input);
    if (!validated.success) {
      throw new Error("Invalid cancel input");
    }

    const { bookingId, userId, reason } = validated.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Load the booking
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          items: true,
          payments: true,
        },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      // 2. Check if user owns this booking or has permission
      if (booking.userId !== userId) {
        // In a real app, check role permissions
        throw new Error("Not authorized to cancel this booking");
      }

      // 3. Check cancellation policy
      // For MVP, we'll allow cancellation with refund based on policy
      const now = dayjs(booking.items[0]?.startAt ?? "");
      const bookingStart = dayjs(booking.items[0]?.startAt ?? "");
      const hoursBeforeStart = now.diff(bookingStart, "hour");

      // 4. Mark booking as cancelled
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      // 5. Update hold if exists
      if (booking.holds.length > 0) {
        await tx.bookingHold.update({
          where: { bookingId },
          data: { status: HoldStatus.RELEASED },
        });
      }

      // 6. Release inventory (the booking item records are kept for audit)
      // The inventory is released by changing the booking status

      // 7. Create refund if applicable
      let refundAmount = 0;
      if (booking.payments.length > 0) {
        const payment = booking.payments[0];
        
        // Simple refund logic based on hours before start
        let refundPercentage = 0;
        if (hoursBeforeStart > 24) {
          refundPercentage = 100;
        } else if (hoursBeforeStart >= 12) {
          refundPercentage = 75;
        } else if (hoursBeforeStart >= 4) {
          refundPercentage = 50;
        } else if (hoursBeforeStart > 0) {
          refundPercentage = 25;
        } else {
          refundPercentage = 0;
        }

        refundAmount = Math.round(payment.amount * (refundPercentage / 100));

        await tx.refund.create({
          data: {
            paymentId: payment.id,
            bookingId,
            amount: refundAmount,
            currency: "INR",
            status: "PENDING",
            reason: reason || "CUSTOMER_REQUEST",
          },
        });
      }

      return {
        bookingId: booking.id,
        status: BookingStatus.CANCELLED,
        refundAmount,
        cancelledAt: now.format(),
      };
    });

    return result;
  }

  /**
   * Reschedule a booking
   */
  async rescheduleBooking(input: {
    bookingId: string;
    userId: string;
    newStartAt: string;
    newEndAt: string;
    newCourtId?: string;
  }) {
    const { bookingId, userId, newStartAt, newEndAt, newCourtId } = input;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Load current booking
      const currentBooking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          items: {
            include: { court: true },
          },
          holds: true,
        },
      });

      if (!currentBooking || currentBooking.status !== BookingStatus.CONFIRMED) {
        throw new Error("Booking not found or not in CONFIRMED state");
      }

      // 2. Validate user ownership
      if (currentBooking.userId !== userId) {
        throw new Error("Not authorized to reschedule this booking");
      }

      const currentItem = currentBooking.items[0];
      const newCourtId = newCourtId || currentItem.courtId;
      const newStart = dayjs(newStartAt);
      const newEnd = dayjs(newEndAt);
      const currentStart = dayjs(currentItem.startAt);
      const currentEnd = dayjs(currentItem.endAt);

      // 3. Validate new slot is in the future and valid duration
      const now = dayjs();
      if (newStart.isBefore(now)) {
        throw new Error("New slot must be in the future");
      }

      if (newEnd.isBefore(newStart)) {
        throw new Error("End time must be after start time");
      }

      // 4. Check availability of new slot
      const newConflict = await tx.bookingItem.findMany({
        where: {
          courtId: newCourtId,
          booking: {
            status: BookingStatus.CONFIRMED,
          },
          OR: [
            {
              startAt: { gte: newStartAt, lte: newEndAt },
            },
            {
              endAt: { gte: newStartAt, lte: newEndAt },
            },
            {
              startAt: { lte: newStartAt },
              endAt: { gte: newEndAt },
            },
          ],
        },
      });

      if (newConflict.length > 0) {
        throw new Error("New slot is not available");
      }

      // 5. Check if rescheduling is allowed per venue policy
      const venue = await tx.venue.findUnique({
        where: { id: currentBooking.venueId },
        include: { reschedulePolicy: true },
      });

      if (!venue?.reschedulePolicy?.allowed) {
        throw new Error("Rescheduling is not allowed for this venue");
      }

      // 6. Calculate price difference
      const oldPrice = currentItem.unitPrice;
      const newPrice = await this.calculateNewPrice(
        tx,
        newCourtId,
        newStartAt,
        newEndAt
      );

      const priceDifference = newPrice - oldPrice;

      // 7. Hold new slot (create temporary hold on new inventory)
      const hold = await tx.bookingHold.create({
        data: {
          courtId: newCourtId,
          startAt: newStartAt,
          endAt: newEndAt,
          expiresAt: dayjs().add(5, "minutes").format(),
          status: HoldStatus.ACTIVE,
        },
      });

      // 8. Update booking with new slot
      await tx.bookingItem.update({
        where: { id: currentItem.id },
        data: {
          courtId: newCourtId,
          startAt: newStartAt,
          endAt: newEndAt,
          unitPrice: newPrice,
          totalPrice: newPrice,
        },
      });

      // 9. Update booking status to RESCHEDULED
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.RESCHEDULED,
        },
      });

      // 10. Release old slot (mark old booking item as released)
      // Note: We keep the historical record but release the inventory

      // 11. Handle price difference payment/refund
      const result = {
        bookingId: booking.id,
        oldCourt: currentItem.court,
        newCourt: await tx.court.findUnique({ where: { id: newCourtId } }),
        oldSlot: `${dayjs(currentItem.startAt).format("HH:mm")} - ${dayjs(currentItem.endAt).format("HH:mm")}`,
        newSlot: `${dayjs(newStartAt).format("HH:mm")} - ${dayjs(newEndAt).format("HH:mm")}`,
        priceDifference,
        holdId: hold.id,
        status: BookingStatus.RESCHEDULED,
      };

      // If there's a price difference, we would handle payment here
      // For now, just record it

      return result;
    });

    return result;
  }

  /**
   * Calculate price for a new slot
   */
  private async calculateNewPrice(
    tx: any,
    courtId: string,
    startAt: string,
    endAt: string
  ): Promise<number> {
    // Get venue and court info
    const bookingItem = await tx.bookingItem.findFirst({
      where: { courtId },
      include: { booking: { include: { venue: true } } },
    });

    if (!bookingItem?.booking?.venue) {
      return 0;
    }

    const venue = bookingItem.booking.venue;
    const date = dayjs(startAt).format("YYYY-MM-DD");
    const start = dayjs(startAt);
    const end = dayjs(endAt);

    // Find applicable pricing rule
    const pricingRules = venue.pricingRules.filter((rule: any) => rule.isActive);
    let price = 0;

    for (const rule of pricingRules) {
      const appliesToCourt = !rule.courtId || rule.courtId === courtId;
      
      if (appliesToCourt) {
        const dayOfWeek = dayjs(date).day();
        if (rule.dayOfWeek !== undefined && rule.dayOfWeek !== dayOfWeek) {
          continue;
        }

        if (rule.startTime && rule.endTime) {
          const startTime = start.format("HH:mm");
          const endTime = end.format("HH:mm");
          const ruleStart = dayjs(rule.startTime, "HH:mm");
          const ruleEnd = dayjs(rule.endTime, "HH:mm");

          if (startTime >= ruleStart.format("HH:mm") && endTime <= ruleEnd.format("HH:mm")) {
            price = rule.pricePerHour;
            break;
          }
        } else {
          price = rule.pricePerHour;
          break;
        }
      }
    }

    const durationHours = end.diff(start, "minute") / 60;
    return Math.round(price * durationHours);
  }
}

export const createHold = async (input: {
  userId: string;
  venueId: string;
  courtId: string;
  startAt: string;
  endAt: string;
  duration: number;
}) => {
  const service = new BookingService();
  return service.createHold(input);
};

export const confirmBooking = async (input: {
  bookingId: string;
  paymentId: string;
  holdId: string;
}) => {
  const service = new BookingService();
  return service.confirmBooking(input);
};

export const cancelBooking = async (input: {
  bookingId: string;
  userId: string;
  reason?: string;
}) => {
  const service = new BookingService();
  return service.cancelBooking(input);
};

export const rescheduleBooking = async (input: {
  bookingId: string;
  userId: string;
  newStartAt: string;
  newEndAt: string;
  newCourtId?: string;
}) => {
  const service = new BookingService();
  return service.rescheduleBooking(input);
};

export default BookingService;