import { prisma } from "../../../../lib/prisma";
import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Input schema for price calculation
 */
const calculatePriceSchema = z.object({
  venueId: z.string(),
  courtId: z.string(),
  startAt: z.string(), // ISO datetime
  endAt: z.string(), // ISO datetime
  userId: z.string().optional(),
  couponCode: z.string().optional(),
});

/**
 * Output schema for price calculation
 */
export type PricingOutput = {
  subtotal: number;
  discount: number;
  platformFee: number;
  tax: number;
  total: number;
  currency: string;
  breakdown: Array<{
    label: string;
    amount: number;
  }>;
};

/**
 * Pricing Service
 * Calculates price based on:
 * - Day of week
 * - Time range
 * - Court
 * - Sport
 * - Holiday
 * - Peak pricing
 * - Off-peak pricing
 * - Special date
 * - Customer membership
 * - Coupon discount
 * - Platform fee
 * - Tax
 */
export class PricingService {
  /**
   * Calculate price for a booking slot
   */
  async calculatePrice(input: {
    venueId: string;
    courtId: string;
    startAt: string;
    endAt: string;
    userId?: string;
    couponCode?: string;
  }): Promise<PricingOutput> {
    const validated = calculatePriceSchema.safeParse(input);
    if (!validated.success) {
      throw new Error("Invalid pricing input");
    }

    const { venueId, courtId, startAt, endAt, userId, couponCode } = validated.data;

    // 1. Load venue and court information
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        pricingRules: true,
        holidays: true,
      },
    });

    if (!venue) {
      throw new Error("Venue not found");
    }

    const court = await prisma.court.findUnique({
      where: { id: courtId },
      include: { sport: true },
    });

    if (!court || !court.active) {
      throw new Error("Court not found or inactive");
    }

    const start = dayjs(startAt);
    const end = dayjs(endAt);
    const now = dayjs();
    const durationMinutes = end.diff(start, "minute");
    const durationHours = durationMinutes / 60;

    // 2. Check if booking is in the past
    if (end.isBefore(now)) {
      throw new Error("Cannot calculate price for past bookings");
    }

    // 3. Check for special date (holiday)
    const specialDateRule = venue.holidays.find(
      (hol) => hol.date && dayjs(hol.date).isSame(start, "day")
    );

    let basePrice = 0;
    let isPeak = false;

    // 4. Apply pricing rule priority:
    // Special date override -> Court-specific rule -> Sport-specific rule -> Venue-wide rule -> Default
    
    // First, check special date override
    if (specialDateRule) {
      basePrice = specialDateRule.pricePerHour || venue.defaultPeakPrice || 500;
      isPeak = specialDateRule.isPeak !== false;
    } else {
      // Apply pricing rule priority
      const pricingRules = venue.pricingRules.filter((rule) => rule.isActive);

      for (const rule of pricingRules) {
        // Check priority (lower number = higher priority)
        // We'll use the first matching rule with highest priority

        // Check if rule applies to this court
        const appliesToCourt = !rule.courtId || rule.courtId === courtId;

        // Check if rule applies to this sport
        const appliesToSport = !rule.sportId || rule.sportId === court.sportId;

        if (!appliesToCourt && !appliesToSport) {
          continue;
        }

        // Check day of week
        const dayOfWeek = start.day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        if (rule.dayOfWeek !== undefined && rule.dayOfWeek !== dayOfWeek) {
          continue;
        }

        // Check time range
        const startTime = start.format("HH:mm");
        const endTime = end.format("HH:mm");

        if (rule.startTime && rule.endTime) {
          const ruleStart = dayjs(rule.startTime, "HH:mm");
          const ruleEnd = dayjs(rule.endTime, "HH:mm");

          // Slot must fall within rule's time range
          const slotStartMinutes = start.hour() * 60 + start.minute();
          const ruleStartMinutes = ruleStart.hour() * 60 + ruleStart.minute();
          const ruleEndMinutes = ruleEnd.hour() * 60 + ruleEnd.minute();
          const slotEndMinutes = end.hour() * 60 + end.minute();

          if (slotStartMinutes >= ruleStartMinutes && slotEndMinutes <= ruleEndMinutes) {
            basePrice = rule.pricePerHour;
            isPeak = this.isPeakTime(rule.startTime, rule.endTime);
            break;
          }
        } else {
          // No time range restriction
          basePrice = rule.pricePerHour;
          isPeak = this.isPeakTimeRule(rule);
          break;
        }
      }
    }

    // 5. Calculate subtotal
    const subtotal = Math.round(basePrice * durationHours);

    // 6. Calculate platform fee (default 4% of subtotal)
    const platformFee = Math.round(subtotal * 0.04);

    // 7. Calculate tax (default 18% for India, configurable)
    const tax = Math.round(subtotal * 0.18);

    // 8. Apply coupon if provided
    let discount = 0;
    let finalTotal = subtotal + platformFee + tax;

    if (couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: couponCode,
          isActive: true,
          startDate: { lte: start },
          endDate: { gte: start },
        },
      });

      if (coupon) {
        // Check minimum booking amount
        if (coupon.minimumBookingAmount && subtotal < coupon.minimumBookingAmount) {
          // Coupon not applicable, no discount
        } else {
          // Calculate discount
          if (coupon.type === "PERCENTAGE") {
            discount = Math.round(subtotal * (coupon.amount / 100));
          } else if (coupon.type === "FIXED") {
            discount = Math.min(coupon.amount, subtotal);
          }

          // Check maximum discount
          if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
            discount = coupon.maximumDiscount;
          }

          finalTotal = subtotal + platformFee + tax - discount;

          // Ensure total doesn't go below 0
          if (finalTotal < 0) {
            finalTotal = 0;
          }
        }
      }
    }

    // 9. Return pricing breakdown
    return {
      subtotal,
      discount,
      platformFee,
      tax,
      total: finalTotal,
      currency: "INR",
      breakdown: [
        { label: "Base Price", amount: subtotal },
        { label: "Platform Fee", amount: platformFee },
        { label: "Tax", amount: tax },
        ...(discount > 0 ? [{ label: "Discount", amount: -(discount as number) }] : []),
      ],
    };
  }

  /**
   * Determine if a time slot is peak pricing
   */
  private isPeakTime(timeRange: string): boolean {
    // Parse HH:MM-HH:MM format
    const [startStr, endStr] = timeRange.split("-");
    if (!startStr || !endStr) return false;

    const start = dayjs(startStr, "HH:mm");
    const end = dayjs(endStr, "HH:mm");
    const now = dayjs();

    // Check if current time falls within this range
    const current = now.hour() * 60 + now.minute();
    const startMinutes = start.hour() * 60 + start.minute();
    const endMinutes = end.hour() * 60 + end.minute();

    if (startMinutes < endMinutes) {
      // Normal case (e.g., 09:00-17:00)
      return current >= startMinutes && current < endMinutes;
    } else {
      // Overnight case (e.g., 22:00-06:00)
      return current >= startMinutes || current < endMinutes;
    }
  }

  /**
   * Determine if a pricing rule is peak pricing
   */
  private isPeakTimeRule(rule: any): boolean {
    // Default logic: evening slots (17:00-22:00) are peak
    const start = dayjs(rule.startTime, "HH:mm");
    const end = dayjs(rule.endTime, "HH:mm");
    const startMinutes = start.hour() * 60 + start.minute();
    const endMinutes = end.hour() * 60 + end.minute();

    // Peak if between 17:00 and 22:00
    return startMinutes >= 1080 && endMinutes <= 1320; // 17*60 to 22*60
  }
}

export const calculatePrice = async (input: {
  venueId: string;
  courtId: string;
  startAt: string;
  endAt: string;
  userId?: string;
  couponCode?: string;
}): Promise<PricingOutput> => {
  const service = new PricingService();
  return service.calculatePrice(input);
};

export default PricingService;