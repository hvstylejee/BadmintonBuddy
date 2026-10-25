import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Public venue discovery endpoint. Detail, availability and pricing live in
 * their own dynamic route handlers so this index remains unambiguous. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || undefined;
    const locality = searchParams.get("locality") || undefined;
    const venues = await prisma.venue.findMany({
      where: { status: "APPROVED", ...(city ? { city } : {}), ...(locality ? { locality } : {}) },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        courts: { where: { active: true }, select: { id: true, name: true, surface: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ venues, total: venues.length });
  } catch (error) {
    console.error("Error fetching venues:", error);
    return NextResponse.json({ error: { code: "VENUE_LIST_UNAVAILABLE", message: "Unable to fetch venues." } }, { status: 500 });
  }
}
