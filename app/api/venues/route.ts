import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailability } from "@/server/domain/availability/availability.service";
import { calculatePrice } from "@/server/domain/pricing/pricing.service";
import { z } from "zod";

/**
 * GET /api/venues
 * List venues with optional filters
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const locality = searchParams.get("locality");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const rating = searchParams.get("rating");
    const sport = searchParams.get("sport");

    let where: any = {};

    if (city) {
      where.city = city;
    }
    if (locality) {
      where.locality = locality;
    }
    if (sport) {
      // Find courts with this sport
      const courts = await prisma.court.findMany({
        where: { sportId: sport },
        select: { venueId: true },
      });
      where.id = { in: courts.map((c) => c.venueId) };
    }

    const venues = await prisma.venue.findMany({
      where,
      status: "APPROVED",
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        courts: {
          where: { active: true },
          select: { id: true, name: true, surface: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Filter by price if needed
    let filteredVenues = venues;
    if (minPrice || maxPrice) {
      filteredVenues = await Promise.all(
        venues.map(async (venue) => {
          const courts = await prisma.court.findMany({
            where: { venueId: venue.id, active: true },
          });
          
          if (courts.length > 0) {
            // Get first court's pricing as representative
            const firstCourt = courts[0];
            const availability = await getAvailability({
              venueId: venue.id,
              sportId: firstCourt.sportId,
              date: new Date().toISOString().split("T")[0],
              duration: 60,
            });
            
            if (availability.slots.length > 0) {
              const minSlotPrice = Math.min(
                ...availability.slots.map((s) => s.price)
              );
              
              if ((minPrice && minSlotPrice < Number(minPrice)) ||
                  (maxPrice && minSlotPrice > Number(maxPrice))) {
                return null; // Filter out
              }
            }
          }
          
          return venue;
        })
      ).then((v) => v.filter((v): v is any => v !== null));
    }

    return NextResponse.json({
      venues: filteredVenues,
      total: filteredVenues.length,
    });
  } catch (error) {
    console.error("Error fetching venues:", error);
    return NextResponse.json(
      { error: "Failed to fetch venues" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/venues/[id]
 * Get venue details
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    
    const venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        images: true,
        courts: {
          include: {
            sport: true,
          },
        },
        operatingHours: true,
        exceptions: true,
        pricingRules: true,
        blockedSlots: true,
      },
    });

    if (!venue || venue.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(venue);
  } catch (error) {
    console.error("Error fetching venue details:", error);
    return NextResponse.json(
      { error: "Failed to fetch venue details" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/venues/[id]/availability
 * Get availability for a venue on a specific date
 */
export async function GETavailability(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id: venueId } = await params;
    const { searchParams } = new URL(request.url);
    
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const duration = Number(searchParams.get("duration")) || 60; // default 60 minutes
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const sportId = searchParams.get("sportId");

    const availability = await getAvailability({
      venueId,
      sportId,
      date,
      duration,
      startTime,
      endTime,
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Error fetching availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/venues/[id]/price
 * Calculate price for a slot
 */
export async function GETprice(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id: venueId } = await params;
    const { searchParams } = new URL(request.url);
    
    const courtId = searchParams.get("courtId");
    const startAt = searchParams.get("startAt");
    const endAt = searchParams.get("endAt");
    const couponCode = searchParams.get("couponCode");

    if (!courtId || !startAt || !endAt) {
      return NextResponse.json(
        { error: "Missing required parameters: courtId, startAt, endAt" },
        { status: 400 }
      );
    }

    const price = await calculatePrice({
      venueId,
      courtId,
      startAt,
      endAt,
      couponCode,
    });

    return NextResponse.json(price);
  } catch (error) {
    console.error("Error calculating price:", error);
    return NextResponse.json(
      { error: "Failed to calculate price" },
      { status: 500 }
    );
  }
}