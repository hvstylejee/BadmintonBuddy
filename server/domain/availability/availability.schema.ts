import { z } from "zod";

/**
 * Input schema for availability query
 */
export const getAvailabilitySchema = z.object({
  venueId: z.string(),
  sportId: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  duration: z.number().int().positive("Duration must be a positive integer"),
  startTime: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);
  }, "Start time must be in HH:MM format"),
  endTime: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(val);
  }, "End time must be in HH:MM format"),
});

/**
 * Output schema for availability response
 */
export const availabilityOutputSchema = z.object({
  date: z.string(),
  venueId: z.string(),
  sportId: z.string().nullish(),
  slots: z.array(z.object({
    start: z.string(),
    end: z.string(),
    status: z.enum(["AVAILABLE", "HELD", "BOOKED", "BLOCKED", "CLOSED", "PAST"]),
    price: z.number(),
    courtId: z.string(),
    courtName: z.string(),
  })),
});

/**
 * Type definitions
 */
export type AvailabilityInput = z.infer<typeof getAvailabilitySchema>;
export type AvailabilityOutput = z.infer<typeof availabilityOutputSchema>;

export type AvailabilitySlot = {
  start: string; // HH:MM
  end: string; // HH:MM
  status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED" | "CLOSED" | "PAST";
  price: number;
  courtId: string;
  courtName: string;
};