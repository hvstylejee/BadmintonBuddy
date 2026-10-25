import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 400) {
    super(message);
  }
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } }, { status: 500 });
}

export async function requireUserId(request: Request) {
  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.sub) throw new ApiError("AUTH_REQUIRED", "Please sign in to continue.", 401);
  return token.sub;
}
