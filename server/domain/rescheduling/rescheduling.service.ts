import { createHold } from "@/server/domain/booking/booking.service";
import { ApiError } from "@/server/http";
import { prisma } from "@/lib/prisma";

/** Acquires the replacement slot before mutating the original booking. */
export async function createRescheduleHold(userId: string, bookingId: string, courtId: string, startAt: string, endAt: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, userId, status: "CONFIRMED" }, include: { items: true } });
  if (!booking) throw new ApiError("BOOKING_NOT_RESCHEDULABLE", "This booking cannot be rescheduled.", 409);
  const current = booking.items[0]; if (!current) throw new ApiError("BOOKING_NOT_RESCHEDULABLE", "Booking has no court allocation.", 409);
  if (new Date(endAt).getTime() - new Date(startAt).getTime() !== current.endAt.getTime() - current.startAt.getTime()) throw new ApiError("BOOKING_NOT_RESCHEDULABLE", "Keep the same booking duration.");
  return createHold(userId, { venueId: booking.venueId, courtId, startAt, endAt });
}
