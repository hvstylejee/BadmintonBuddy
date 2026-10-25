import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Input schema for cancellation evaluation
 */
const evaluateCancellationSchema = z.object({
  bookingId: z.string(),
  userId: z.string(),
});

/**
 * Cancellation result type
 */
export type CancellationResult = {
  allowed: boolean;
  reason?: string;
  refundAmount: number;
  feeRetained: number;
  originalTotal: number;
};

/**
 * Cancellation Policy Rule
 * Defines refund percentages based on hours before start
 */
export type CancellationPolicyRule = {
  minHoursBeforeStart: number;
  refundPercentage: number;
};

/**
 * Cancellation Service
 * Evaluates cancellation eligibility and calculates refund amounts
 * based on venue-configured policies
 */
export class CancellationService {
  /**
   * Evaluate if a booking can be cancelled and calculate refund
   */
  async evaluateCancellation(input: {
    bookingId: string;
    userId: string;
  }): Promise<CancellationResult> {
    const validated = evaluateCancellationSchema.safeParse(input);
    if (!validated.success) {
      throw new Error("Invalid cancellation input");
    }

    const { bookingId, userId } = validated.data;

    // 1. Load the booking with all related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        items: {
          include: { court: true },
        },
        payments: true,
        venue: true,
        cancellationPolicy: true,
      },
    });

    if (!booking) {
      throw new Error("Booking not found");
    }

    // 2. Check user ownership
    if (booking.userId !== userId) {
      throw new Error("Not authorized to cancel this booking");
    }

    // 3. Check if booking can be cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      return {
        allowed: false,
        reason: "Booking is already cancelled",
        refundAmount: 0,
        feeRetained: booking.totalAmount,
        originalTotal: booking.totalAmount,
      };
    }

    if (booking.status === BookingStatus.COMPLETED) {
      return {
        allowed: false,
        reason: "Completed bookings cannot be cancelled",
        refundAmount: 0,
        feeRetained: booking.totalAmount,
        originalTotal: booking.totalAmount,
      };
    }

    // 4. Get cancellation policy for the venue
    const policy = booking.cancellationPolicy;
    const rules = policy?.rules || [];

    // 5. Calculate hours before start
    const bookingStart = dayjs(booking.items[0]?.startAt);
    const now = dayjs();
    const hoursBeforeStart = now.diff(bookingStart, "hour");

    // 6. Find applicable refund rule
    let applicableRule: CancellationPolicyRule | null = null;

    for (const rule of rules) {
      if (hoursBeforeStart <= rule.minHoursBeforeStart) {
        applicableRule = rule;
        break;
      }
    }

    // If no rule matches, default to 0% refund
    if (!applicableRule) {
      return {
        allowed: true,
        reason: "Cancellation allowed - no refund applicable",
        refundAmount: 0,
        feeRetained: booking.totalAmount,
        originalTotal: booking.totalAmount,
      };
    }

    // 7. Calculate refund amount
    const refundPercentage = applicableRule.refundPercentage;
    const refundAmount = Math.round(booking.totalAmount * (refundPercentage / 100));
    const feeRetained = booking.totalAmount - refundAmount;

    // 8. Check if payment exists and initiate refund
    let refundId: string | null = null;

    if (booking.payments.length > 0) {
      const payment = booking.payments[0];

      // Create refund record
      const refund = await prisma.refund.create({
        data: {
          paymentId: payment.id,
          bookingId,
          amount: refundAmount,
          currency: "INR",
          status: "PENDING",
          reason: "CUSTOMER_REQUEST",
        },
      });

      refundId = refund.id;
    }

    return {
      allowed: true,
      reason: applicableRule 
        ? `Cancellation ${hoursBeforeStart} hours before start - ${refundPercentage}% refund`
        : "Cancellation allowed",
      refundAmount,
      feeRetained: refundAmount > 0 ? 0 : booking.totalAmount,
      originalTotal: booking.totalAmount,
    };
  }

  /**
   * Process a cancellation
   */
  async processCancellation(input: {
    bookingId: string;
    userId: string;
    reason?: string;
  }) {
    const result = await this.evaluateCancellation({
      bookingId,
      userId,
    });

    if (!result.allowed) {
      throw new Error(result.reason || "Cancellation not allowed");
    }

    // Begin transaction
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Mark booking as cancelled
      await tx.booking.update({
        where: { id: input.bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      // 2. Update hold if exists
      const hold = await tx.bookingHold.findFirst({
        where: { bookingId: input.bookingId },
      });

      if (hold) {
        await tx.bookingHold.update({
          where: { id: hold.id },
          data: { status: HoldStatus.RELEASED },
        });
      }

      // 3. Update payment status
      if (tx.payment.count({ where: { bookingId: input.bookingId } }) > 0) {
        await tx.payment.updateMany({
          where: { bookingId: input.bookingId },
          data: { status: PaymentStatus.REFUND_PENDING },
        });
      }

      // 4. Update refund status
      if (tx.refund.count({ where: { bookingId: input.bookingId } }) === 0) {
        await tx.refund.create({
          data: {
            bookingId: input.bookingId,
            amount: result.refundAmount,
            currency: "INR",
            status: "PARTIALLY_REFUNDED",
            reason: input.reason || "CUSTOMER_REQUEST",
          },
        });
      } else {
        // Update existing refund
        const existingRefund = await tx.refund.findFirst({
          where: { bookingId: input.bookingId },
        });

        if (existingRefund) {
          await tx.refund.update({
            where: { id: existingRefund.id },
            data: {
              status: "PARTIALLY_REFUNDED",
              completedAt: new Date(),
            },
          });
        }
      }

      // 5. Release inventory - this is handled by the booking status change
      // The booking item records remain for audit but the inventory is considered released

      return {
        ...result,
        refundId,
        processedAt: new Date(),
      };
    });

    return transaction;
  }

  /**
   * Get cancellation policy for a venue
   */
  async getCancellationPolicy(venueId: string) {
    const policy = await prisma.cancellationPolicy.findFirst({
      where: { venueId, isActive: true },
    });

    return policy?.rules || [];
  }
}

export const evaluateCancellation = async (input: {
  bookingId: string;
  userId: string;
}): Promise<CancellationResult> => {
  const service = new CancellationService();
  return service.evaluateCancellation(input);
};

export const processCancellation = async (input: {
  bookingId: string;
  userId: string;
  reason?: string;
}) => {
  const service = new CancellationService();
  return service.processCancellation(input);
};

export default CancellationService;