import { createHold } from "@/server/domain/booking/booking.service";
import { apiError, requireUserId } from "@/server/http";
import { NextResponse } from "next/server";

export async function POST(request: Request) { try { const userId = await requireUserId(request); return NextResponse.json(await createHold(userId, await request.json()), { status: 201 }); } catch (error) { return apiError(error); } }
