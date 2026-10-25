import { prisma } from "@/lib/prisma";
import { calculatePrice } from "@/server/domain/pricing/pricing.service";
import { ApiError } from "@/server/http";
import { z } from "zod";

const inputSchema = z.object({ venueId: z.string().min(1), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), duration: z.coerce.number().int().min(30).max(240).multipleOf(30), sportId: z.string().optional() });
type SlotStatus = "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED" | "CLOSED" | "PAST";
const localDate = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);
const overlap = (start: Date, end: Date, otherStart: Date, otherEnd: Date) => start < otherEnd && end > otherStart;

export async function getAvailability(input: z.input<typeof inputSchema>) {
  const parsed = inputSchema.safeParse(input); if (!parsed.success) throw new ApiError("INVALID_SLOT", "Date must be YYYY-MM-DD and duration 30–240 minutes.");
  const { venueId, date, duration, sportId } = parsed.data;
  const venue = await prisma.venue.findFirst({ where: { id: venueId, status: "APPROVED" }, include: { operatingHours: true, exceptions: true, courts: { where: { active: true, ...(sportId ? { sportId } : {}) } } } });
  if (!venue) throw new ApiError("VENUE_NOT_FOUND", "Venue not found.", 404);
  const dayStart = localDate(date, "00:00"), dayEnd = localDate(date, "23:59");
  if (dayEnd < new Date()) return { venueId, date, duration, courts: [] };
  if (venue.exceptions.some((item) => item.isClosed && item.date.toISOString().slice(0, 10) === date)) return { venueId, date, duration, courts: [] };
  const hours = venue.operatingHours.find((item) => item.dayOfWeek === dayStart.getUTCDay() && !item.isClosed);
  if (!hours) return { venueId, date, duration, courts: [] };
  const [bookings, holds, blocks] = await Promise.all([
    prisma.bookingItem.findMany({ where: { courtId: { in: venue.courts.map((court) => court.id) }, booking: { status: { in: ["CONFIRMED", "PAYMENT_PENDING"] } }, startAt: { lt: dayEnd }, endAt: { gt: dayStart } } }),
    prisma.bookingHold.findMany({ where: { courtId: { in: venue.courts.map((court) => court.id) }, status: "ACTIVE", expiresAt: { gt: new Date() }, startAt: { lt: dayEnd }, endAt: { gt: dayStart } } }),
    prisma.blockedSlot.findMany({ where: { venueId, startAt: { lt: dayEnd }, endAt: { gt: dayStart } } }),
  ]);
  const opening = localDate(date, hours.openingTime), closing = localDate(date, hours.closingTime); const slots = [] as { start: string; end: string; status: SlotStatus; price: number | null }[];
  for (let start = new Date(opening); start.getTime() + duration * 60_000 <= closing.getTime(); start = new Date(start.getTime() + 30 * 60_000)) {
    const end = new Date(start.getTime() + duration * 60_000); const startLabel = start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }); const endLabel = end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
    slots.push({ start: startLabel, end: endLabel, status: start < new Date() ? "PAST" : "AVAILABLE", price: null });
  }
  return { venueId, date, duration, courts: await Promise.all(venue.courts.map(async (court) => ({ courtId: court.id, courtName: court.name, slots: await Promise.all(slots.map(async (slot) => { const start = localDate(date, slot.start); const end = localDate(date, slot.end); const status: SlotStatus = slot.status === "PAST" ? "PAST" : blocks.some((block) => (!block.courtId || block.courtId === court.id) && overlap(start, end, block.startAt, block.endAt)) ? "BLOCKED" : bookings.some((booking) => booking.courtId === court.id && overlap(start, end, booking.startAt, booking.endAt)) ? "BOOKED" : holds.some((hold) => hold.courtId === court.id && overlap(start, end, hold.startAt, hold.endAt)) ? "HELD" : "AVAILABLE"; const price = status === "AVAILABLE" ? (await calculatePrice({ venueId, courtId: court.id, startAt: start.toISOString(), endAt: end.toISOString() }).catch(() => null)) : null; return { ...slot, status, price: price?.total ?? null }; })) })) };
}
