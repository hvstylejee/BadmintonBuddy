import { calculatePrice } from "@/server/domain/pricing/pricing.service";
import { apiError } from "@/server/http";
import { NextResponse } from "next/server";

export async function POST(request: Request) { try { return NextResponse.json(await calculatePrice(await request.json())); } catch (error) { return apiError(error); } }
