import { prisma } from "@/lib/prisma";
import { apiError, requireUserId } from "@/server/http";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId(request); const status = new URL(request.url).searchParams.get("status");
    const bookings = await prisma.booking.findMany({ where: { userId, ...(status ? { status: status as never } : {}) }, include: { venue: true, items: { include: { court: true } }, payments: true }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ bookings });
  } catch (error) { return apiError(error); }
}
