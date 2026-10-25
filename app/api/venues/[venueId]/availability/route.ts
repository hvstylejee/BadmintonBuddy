import { getAvailability } from "@/server/domain/availability/availability.service";
import { apiError } from "@/server/http";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ venueId: string }> }) {
  try { const { venueId } = await params; const query = new URL(request.url).searchParams; return NextResponse.json(await getAvailability({ venueId, date: query.get("date"), duration: query.get("duration"), sportId: query.get("sportId") ?? undefined })); } catch (error) { return apiError(error); }
}
