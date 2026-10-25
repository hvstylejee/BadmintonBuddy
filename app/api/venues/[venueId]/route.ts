import { prisma } from "@/lib/prisma";
import { ApiError, apiError } from "@/server/http";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ venueId: string }> }) {
  try {
    const { venueId } = await params;
    const venue = await prisma.venue.findFirst({ where: { id: venueId, status: "APPROVED" }, include: { images: { orderBy: { order: "asc" } }, courts: { where: { active: true }, include: { sport: true } }, operatingHours: true, cancellationPolicies: { where: { isActive: true } }, reschedulePolicies: { where: { isActive: true } } } });
    if (!venue) throw new ApiError("VENUE_NOT_FOUND", "Venue not found.", 404);
    return NextResponse.json({ venue });
  } catch (error) { return apiError(error); }
}
