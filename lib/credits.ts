import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export {
  ASPECT_RATIOS,
  DURATION_OPTIONS,
  RESOLUTION_MULTIPLIERS,
  RESOLUTION_OPTIONS,
  calculateCost,
} from "./pricing";

export class InsufficientCreditsError extends Error {
  constructor(
    readonly required: number,
    readonly available: number,
  ) {
    super(`Insufficient credits: need ${required}, have ${available}`);
    this.name = "InsufficientCreditsError";
  }
}

type Tx = Prisma.TransactionClient;

/**
 * Atomically deduct credits, guarding against concurrent generations: the
 * conditional updateMany only matches while the balance is still high enough,
 * so two parallel requests can never overdraw the account.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  tx: Tx | typeof prisma = prisma,
): Promise<void> {
  if (amount <= 0) return;

  const updated = await tx.user.updateMany({
    where: { id: userId, credits: { gte: amount } },
    data: { credits: { decrement: amount } },
  });

  if (updated.count === 0) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    throw new InsufficientCreditsError(amount, user?.credits ?? 0);
  }

  await tx.creditTransaction.create({
    data: { userId, amount: -amount, type: "deduction", description },
  });
}

export async function refundCredits(
  userId: string,
  amount: number,
  description: string,
  tx: Tx | typeof prisma = prisma,
): Promise<void> {
  if (amount <= 0) return;
  await tx.user.update({ where: { id: userId }, data: { credits: { increment: amount } } });
  await tx.creditTransaction.create({
    data: { userId, amount, type: "refund", description },
  });
}

export async function addPurchasedCredits(
  userId: string,
  amount: number,
  description: string,
  stripePaymentId?: string,
): Promise<void> {
  // The Stripe payment id is unique in the schema, so a replayed webhook
  // aborts here instead of granting the credits twice.
  await prisma.$transaction(async (tx) => {
    await tx.creditTransaction.create({
      data: { userId, amount, type: "purchase", description, stripePaymentId },
    });
    await tx.user.update({ where: { id: userId }, data: { credits: { increment: amount } } });
  });
}

export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  return user?.credits ?? 0;
}
