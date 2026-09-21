import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FREE_TIER_CREDITS, hashPassword } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email, password, name } = signupSchema.parse(await request.json());

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash: await hashPassword(password),
        credits: FREE_TIER_CREDITS,
      },
    });

    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: FREE_TIER_CREDITS,
        type: "bonus",
        description: "Free tier welcome credits",
      },
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
