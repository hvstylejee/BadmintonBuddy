import { confirmBooking } from "@/server/domain/booking/booking.service";
import { apiError, requireUserId } from "@/server/http";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) { try { const userId = await requireUserId(request); const { bookingId } = await params; const body = await request.json(); return NextResponse.json(await confirmBooking(userId, { ...body, bookingId })); } catch (error) { return apiError(error); } }
