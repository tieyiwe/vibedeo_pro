import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      credits: user.credits,
      plan: user.plan,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
