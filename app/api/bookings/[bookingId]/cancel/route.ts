import { cancelBooking } from "@/server/domain/cancellation/cancellation.service";
import { apiError, requireUserId } from "@/server/http";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ bookingId: string }> }) { try { const userId = await requireUserId(request); const { bookingId } = await params; const body = await request.json().catch(() => ({})); return NextResponse.json(await cancelBooking(userId, bookingId, body.reason)); } catch (error) { return apiError(error); } }
