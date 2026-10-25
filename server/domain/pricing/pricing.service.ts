import { prisma } from "@/lib/prisma";
import { ApiError } from "@/server/http";
import { z } from "zod";

const inputSchema = z.object({ venueId: z.string().min(1), courtId: z.string().min(1), startAt: z.string().datetime(), endAt: z.string().datetime(), couponCode: z.string().trim().toUpperCase().optional() });
export type PricingOutput = { subtotal: number; discount: number; platformFee: number; tax: number; total: number; currency: string; breakdown: { label: string; amount: number }[] };

const minutes = (value: string) => { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; };
const decimal = (value: { toString(): string } | number) => Number(value.toString());

export async function calculatePrice(input: z.input<typeof inputSchema>): Promise<PricingOutput> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new ApiError("INVALID_SLOT", "Provide a valid court and ISO date range.");
  const { venueId, courtId, startAt, endAt, couponCode } = parsed.data;
  const start = new Date(startAt); const end = new Date(endAt);
  if (start >= end || start <= new Date()) throw new ApiError("INVALID_SLOT", "Choose a future end time after the start time.");
  const court = await prisma.court.findFirst({ where: { id: courtId, venueId, active: true }, include: { venue: { include: { pricingRules: { where: { isActive: true }, orderBy: { priority: "desc" } } } } } });
  if (!court || court.venue.status !== "APPROVED") throw new ApiError("COURT_NOT_FOUND", "That court is unavailable.", 404);
  const day = start.getDay(); const startMinute = start.getHours() * 60 + start.getMinutes(); const endMinute = end.getHours() * 60 + end.getMinutes();
  const rule = court.venue.pricingRules.find((candidate) => {
    const courtMatches = !candidate.courtId || candidate.courtId === court.id;
    const sportMatches = !candidate.sportId || candidate.sportId === court.sportId;
    const dayMatches = candidate.dayOfWeek === null || candidate.dayOfWeek === day;
    const timeMatches = !candidate.startTime || !candidate.endTime || (startMinute >= minutes(candidate.startTime) && endMinute <= minutes(candidate.endTime));
    return courtMatches && sportMatches && dayMatches && timeMatches;
  });
  if (!rule) throw new ApiError("PRICE_UNAVAILABLE", "This court has no active price for that time.");
  const subtotal = Math.round(decimal(rule.pricePerHour) * ((end.getTime() - start.getTime()) / 3_600_000));
  let discount = 0;
  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
    const active = coupon && coupon.isActive && coupon.startDate <= new Date() && coupon.endDate >= new Date() && subtotal >= decimal(coupon.minimumBookingAmount);
    if (!active) throw new ApiError("INVALID_COUPON", "This coupon cannot be applied to this booking.");
    discount = coupon.type === "PERCENTAGE" ? Math.floor(subtotal * decimal(coupon.amount) / 100) : decimal(coupon.amount);
    discount = Math.min(discount, decimal(coupon.maximumDiscount), subtotal);
  }
  const platformFee = 20; const tax = 0; const total = Math.max(0, subtotal - discount + platformFee + tax);
  return { subtotal, discount, platformFee, tax, total, currency: "INR", breakdown: [{ label: "Court fee", amount: subtotal }, { label: "Convenience fee", amount: platformFee }, ...(discount ? [{ label: "Discount", amount: -discount }] : []), { label: "Tax", amount: tax }] };
}
