import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "./auth";
import { InsufficientCreditsError } from "./credits";

/** Turn thrown errors into consistent JSON responses. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: "You need to sign in" }, { status: 401 });
  }
  if (error instanceof InsufficientCreditsError) {
    return NextResponse.json(
      {
        error: "Not enough credits",
        required: error.required,
        available: error.available,
        code: "insufficient_credits",
      },
      { status: 402 },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid request", issues: error.issues },
      { status: 400 },
    );
  }
  const message = error instanceof Error ? error.message : "Something went wrong";
  console.error("[api]", error);
  return NextResponse.json({ error: message }, { status: 400 });
}
