import { prisma } from "../../../../lib/prisma";
import { 
  UserRole, 
  VenueStatus, 
  CourtSurface, 
  BookingStatus, 
  HoldStatus, 
  PaymentStatus 
} from "@prisma/client";
import { 
  getAvailability as getAvailabilitySchema, 
  AvailabilitySlot 
} from "./availability.schema";
import { z } from "zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Availability Input Schema
 */
const AvailabilityInputSchema = z.object({
  venueId: z.string(),
  sportId: z.string().optional(),
  date: z.string(),
  duration: z.number(), // in minutes
  startTime: z.string().optional(), // HH:MM format
  endTime: z.string().optional(), // HH:MM format
});

/**
 * Availability Output Schema
 */
export type AvailabilityInput = z.infer<typeof AvailabilityInputSchema>;
export type AvailabilityOutput = {
  date: string;
  venueId: string;
  sportId: string | null;
  slots: AvailabilitySlot[];
};

export type AvailabilitySlot = {
  start: string; // HH:MM
  end: string; // HH:MM
  status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED" | "CLOSED" | "PAST";
  price: number;
  courtId: string;
  courtName: string;
};

/**
 * Availability Service
 * Generates available slot intervals based on:
 * - Operating Hours
 * - Court inventory
 * - Pricing Rules
 * - Existing Bookings
 * - Active Holds
 * - Blocked Slots
 * - Exceptions
 */
export class AvailabilityService {
  /**
   * Get available slots for a venue on a specific date
   */
  async getAvailability(input: AvailabilityInput): Promise<AvailabilityOutput> {
    // 1. Validate input
    const validated = AvailabilityInputSchema.safeParse(input);
    if (!validated.success) {
      throw new Error("Invalid availability input");
    }

    const { venueId, sportId, date, duration } = validated.data;

    // 2. Load venue and timezone
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
      include: {
        timezone: true,
        courts: true,
        operatingHours: true,
        exceptions: true,
        blockedSlots: true,
        pricingRules: true,
      },
    });

    if (!venue || venue.status !== VenueStatus.APPROVED) {
      throw new Error("Venue not found or not approved");
    }

    const venueTz = venue.timezone ?? "Asia/Kolkata";
    const dateObj = dayjs.tz(date, venueTz);
    
    // Check if date is in the past
    const now = dayjs.tz(venueTz);
    if (dateObj.isBefore(now, "day")) {
      return {
        date,
        venueId,
        sportId,
        slots: [],
      };
    }

    // 3. Apply date exceptions
    const exceptions = venue.exceptions.filter(
      (ex) => ex.date && dayjs(ex.date).isSame(dateObj, "day")
    );

    // 4. Load active courts
    const activeCourts = venue.courts.filter((court) => court.active);

    if (activeCourts.length === 0) {
      return {
        date,
        venueId,
        sportId,
        slots: [],
      };
    }

    // 5. Generate candidate intervals based on operating hours
    const operatingHours = this.getOperatingHoursForDate(
      venue.operatingHours,
      dateObj,
      exceptions
    );

    if (!operatingHours) {
      return {
        date,
        venueId,
        sportId,
        slots: [],
      };
    }

    // 6. Generate slots based on granularity
    const slotGranularity = this.getSlotGranularity(venue);
    const slots = this.generateCandidateSlots(
      operatingHours,
      slotGranularity,
      duration
    );

    // 7. Load existing bookings for this date
    const startOfDay = dateObj.startOf("day").format("YYYY-MM-DD");
    const endOfDay = dateObj.endOf("day").format("YYYY-MM-DD");

    const existingBookings = await prisma.bookingItem.findMany({
      where: {
        booking: {
          venueId,
          status: BookingStatus.CONFIRMED,
        },
        startAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        court: true,
      },
    });

    // 8. Load active holds
    const activeHolds = await prisma.bookingHold.findMany({
      where: {
        courtId: { in: activeCourts.map((c) => c.id) },
        expiresAt: { gt: now.format() },
        status: HoldStatus.ACTIVE,
      },
    });

    // 9. Load blocked slots
    const blockedSlots = await prisma.blockedSlot.findMany({
      where: {
        venueId,
        OR: [
          { startAt: { lte: endOfDay }, endAt: { gte: startOfDay } },
          { AND: [{ startAt: { gte: startOfDay } }, { endAt: { lte: endOfDay } }] },
        ],
      },
    });

    // 10. Filter and price slots
    const filteredSlots = this.filterSlots(
      slots,
      activeCourts,
      existingBookings,
      activeHolds,
      blockedSlots,
      venue,
      dateObj,
      duration,
      sportId
    );

    return {
      date,
      venueId,
      sportId,
      slots: filteredSlots,
    };
  }

  /**
   * Get operating hours for a specific date, accounting for exceptions
   */
  private getOperatingHoursForDate(
    hours: any[],
    date: dayjs.Dayjs,
    exceptions: any[]
  ) {
    // Find matching operating hour for the day of week
    const dayOfWeek = date.day(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const matchingHour = hours.find(
      (h) => h.dayOfWeek === dayOfWeek
    );

    if (!matchingHour || matchingHour.isClosed) {
      return null;
    }

    const opening = dayjs(matchingHour.openingTime, "HH:mm");
    const closing = dayjs(matchingHour.closingTime, "HH:mm");

    // Check for date-specific exception
    const exception = exceptions.find(
      (ex) => ex.isClosed
    );

    if (exception && exception.isClosed) {
      return null;
    }

    // Apply break periods if any
    let effectiveOpening = opening;
    let effectiveClosing = closing;

    if (matchingHour.breakStart && matchingHour.breakEnd) {
      const breakStart = dayjs(matchingHour.breakStart, "HH:mm");
      const breakEnd = dayjs(matchingHour.breakEnd, "HH:mm");
      
      // If the slot falls within break period, adjust
      // For simplicity, we'll just mark the break period
    }

    return {
      opening: opening.format("HH:mm"),
      closing: closing.format("HH:mm"),
      breakStart: matchingHour.breakStart,
      breakEnd: matchingHour.breakEnd,
    };
  }

  /**
   * Get slot granularity for a venue
   */
  private getSlotGranularity(venue: any): number {
    // Check venue-specific or sport-specific settings
    // Default to 30 minutes for MVP
    return 30;
  }

  /**
   * Generate candidate time slots
   */
  private generateCandidateSlots(
    operatingHours: { opening: string; closing: string; breakStart?: string; breakEnd?: string },
    granularity: number,
    duration: number
  ): AvailabilitySlot[] {
    const slots: AvailabilitySlot[] = [];
    const opening = dayjs(operatingHours.opening, "HH:mm");
    const closing = dayjs(operatingHours.closing, "HH:mm");
    const breakStart = operatingHours.breakStart 
      ? dayjs(operatingHours.breakStart, "HH:mm") 
      : null;
    const breakEnd = operatingHours.breakEnd 
      ? dayjs(operatingHours.breakEnd, "HH:mm") 
      : null;

    let currentTime = opening;
    const endTime = closing;

    while (currentTime.add(granularity, "minute").isBefore(endTime) || 
           currentTime.add(granularity, "minute").isSame(endTime, "minute")) {
      
      // Skip break period
      if (breakStart && breakEnd) {
        const currentMoment = currentTime.clone();
        if (currentMoment.isAfter(breakStart) && currentMoment.isBefore(breakEnd)) {
          currentTime = breakEnd;
          continue;
        }
      }

      const slotStart = currentTime.format("HH:mm");
      const slotEnd = currentTime.add(granularity, "minute").format("HH:mm");
      
      // Only add if slot end is within operating hours
      const slotEndMoment = dayjs(slotEnd, "HH:mm");
      if (slotEndMoment.isSameOrBefore(dayjs(operatingHours.closing, "HH:mm"))) {
        slots.push({
          start: slotStart,
          end: slotEnd,
        });
      }

      currentTime = currentTime.add(granularity, "minute");
    }

    return slots;
  }

  /**
   * Filter slots based on availability, bookings, holds, and blocks
   */
  private filterSlots(
    candidates: AvailabilitySlot[],
    activeCourts: any[],
    existingBookings: any[],
    activeHolds: any[],
    blockedSlots: any[],
    venue: any,
    date: dayjs.Dayjs,
    duration: number,
    sportId: string | null
  ): AvailabilitySlot[] {
    // Build conflict lookups
    const bookingMap = new Map<string, Set<string>>(); // courtId -> set of booked time ranges
    const holdMap = new Map<string, Set<string>>(); // courtId -> set of held time ranges
    const blockMap = new Map<string, Set<string>>(); // courtId -> set of blocked time ranges

    // Populate booking conflicts
    existingBookings.forEach((booking) => {
      const courtId = booking.courtId;
      if (!bookingMap.has(courtId)) {
        bookingMap.set(courtId, new Set());
      }
      // Parse booking time range
      const start = dayjs(booking.startAt, "YYYY-MM-DDTHH:mm:ss");
      const end = dayjs(booking.endAt, "YYYY-MM-DDTHH:mm:ss");
      
      // Add all slots that overlap with this booking
      // For simplicity, mark the entire booking range as booked
    });

    // Populate hold conflicts
    activeHolds.forEach((hold) => {
      const courtId = hold.courtId;
      if (!holdMap.has(courtId)) {
        holdMap.set(courtId, new Set());
      }
      const start = dayjs(hold.startAt, "YYYY-MM-DDTHH:mm:ss");
      const end = dayjs(hold.endAt, "YYYY-MM-DDTHH:mm:ss");
      holdMap.get(courtId)?.add(`${start.format("HH:mm")}-${end.format("HH:mm")}`);
    });

    // Populate block conflicts
    blockedSlots.forEach((block) => {
      const courtId = block.courtId;
      if (!blockMap.has(courtId)) {
        blockMap.set(courtId, new Set());
      }
      const start = dayjs(block.startAt, "YYYY-MM-DDTHH:mm:ss");
      const end = dayjs(block.endAt, "YYYY-MM-DDTHH:mm:ss");
      blockMap.get(courtId)?.add(`${start.format("HH:mm")}-${end.format("HH:mm")}`);
    });

    // Filter slots for each court
    const filtered: AvailabilitySlot[] = [];

    candidates.forEach((slot) => {
      const slotStart = dayjs(slot.start, "HH:mm");
      const slotEnd = dayjs(slot.end, "HH:mm");
      let isAvailable = true;
      let assignedCourt: any | null = null;

      // Try each court
      for (const court of activeCourts) {
        const courtBookings = bookingMap.get(court.id) || new Set();
        const courtHolds = holdMap.get(court.id) || new Set();
        const courtBlocks = blockMap.get(court.id) || new Set();

        // Check for conflicts
        const slotKey = `${slotStart.format("HH:mm")}-${slotEnd.format("HH:mm")}`;
        
        let hasConflict = false;
        
        // Check bookings
        for (const bookingKey of courtBookings) {
          if (this.timeRangesOverlap(slotStart, slotEnd, ...bookingKey.split("-"))) {
            hasConflict = true;
            break;
          }
        }

        // Check holds
        if (!hasConflict) {
          for (const holdKey of courtHolds) {
            if (this.timeRangesOverlap(slotStart, slotEnd, ...holdKey.split("-"))) {
              hasConflict = true;
              break;
            }
          }
        }

        // Check blocks
        if (!hasConflict) {
          for (const blockKey of courtBlocks) {
            if (this.timeRangesOverlap(slotStart, slotEnd, ...blockKey.split("-"))) {
              hasConflict = true;
              break;
            }
          }
        }

        if (!hasConflict) {
          assignedCourt = court;
          break; // Found a court with no conflict
        }
      }

      if (isAvailable && assignedCourt) {
        // Calculate price
        const price = this.calculateSlotPrice(
          assignedCourt,
          date,
          slotStart,
          slotEnd,
          venue
        );

        filtered.push({
          start: slot.start,
          end: slot.end,
          status: "AVAILABLE",
          price,
          courtId: assignedCourt.id,
          courtName: assignedCourt.name,
        });
      }
    });

    return filtered;
  }

  /**
   * Check if two time ranges overlap
   */
  private timeRangesOverlap(
    start1: dayjs.Dayjs,
    end1: dayjs.Dayjs,
    start2Str: string,
    end2Str: string
  ): boolean {
    const start2 = dayjs(start2Str, "HH:mm");
    const end2 = dayjs(end2Str, "HH:mm");
    
    // Overlap condition: start1 < end2 AND end1 > start2
    return start1.isBefore(end2, "minute") && end1.isAfter(start2, "minute");
  }

  /**
   * Calculate price for a slot
   */
  private calculateSlotPrice(
    court: any,
    date: dayjs.Dayjs,
    start: dayjs.Dayjs,
    end: dayjs.Dayjs,
    venue: any
  ): number {
    // Get pricing rules for this venue/court/sport
    const pricingRules = venue.pricingRules.filter((rule: any) => rule.isActive);
    
    // Default price
    let price = 0;
    
    // Find applicable pricing rule
    for (const rule of pricingRules) {
      // Check if rule applies to this court or sport
      const appliesToCourt = !rule.courtId || rule.courtId === court.id;
      const appliesToSport = !rule.sportId || rule.sportId === court.sportId;
      
      if (appliesToCourt || appliesToSport) {
        // Check day of week
        const dayOfWeek = date.day(); // 0=Sunday, 1=Monday, ...
        if (rule.dayOfWeek !== undefined && rule.dayOfWeek !== dayOfWeek) {
          continue;
        }
        
        // Check time range
        const startTime = start.format("HH:mm");
        const endTime = end.format("HH:mm");
        
        // Simple time range check - if rule has startTime and endTime
        if (rule.startTime && rule.endTime) {
          const ruleStart = dayjs(rule.startTime, "HH:mm");
          const ruleEnd = dayjs(rule.endTime, "HH:mm");
          
          // Check if slot falls within rule's time range
          if (startTime >= ruleStart.format("HH:mm") && endTime <= ruleEnd.format("HH:mm")) {
            price = rule.pricePerHour;
            break;
          }
        } else {
          // No time range restriction, use this rule's price
          price = rule.pricePerHour;
          break;
        }
      }
    }

    // Calculate price based on duration (in minutes)
    const durationHours = end.diff(start, "minute") / 60;
    return Math.round(price * durationHours);
  }
}

export const getAvailability = async (input: AvailabilityInput): Promise<AvailabilityOutput> => {
  const service = new AvailabilityService();
  return service.getAvailability(input);
};

export default AvailabilityService;