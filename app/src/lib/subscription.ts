import { prisma } from "@/lib/db";
import { getPlanByPriceId, getPlanLimits, type PlanKey } from "@/lib/plans";

export type SubscriptionStatus = {
  plan: PlanKey;
  isActive: boolean;
  isPro: boolean;
  limits: { units: number; leases: number };
  periodEnd: Date | null;
};

/**
 * Get subscription status for a user. Free plan is always "active".
 * Pro plan is active only if stripeCurrentPeriodEnd is in the future.
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<SubscriptionStatus> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      stripePriceId: true,
      stripeSubscriptionId: true,
      stripeCurrentPeriodEnd: true,
    },
  });

  const plan = getPlanByPriceId(user.stripePriceId);
  const limits = getPlanLimits(user.stripePriceId);

  // Free plan is always active
  if (plan === "free") {
    return { plan, isActive: true, isPro: false, limits, periodEnd: null };
  }

  // Pro plan: check if subscription is current
  const isActive =
    !!user.stripeSubscriptionId &&
    !!user.stripeCurrentPeriodEnd &&
    user.stripeCurrentPeriodEnd > new Date();

  return {
    plan: isActive ? "pro" : "free",
    isActive,
    isPro: isActive,
    limits: isActive ? limits : getPlanLimits(null), // Fall back to free limits if expired
    periodEnd: user.stripeCurrentPeriodEnd,
  };
}

/**
 * Check if user can create more of a resource. Returns { allowed, current, limit }.
 */
export async function checkPlanLimit(
  userId: string,
  resource: "units" | "leases"
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const status = await getSubscriptionStatus(userId);
  const limit = status.limits[resource];

  let current: number;
  if (resource === "units") {
    current = await prisma.unit.count({
      where: {
        property: { userId },
      },
    });
  } else {
    current = await prisma.lease.count({
      where: { userId, leaseStatus: 0 }, // active leases only
    });
  }

  return { allowed: current < limit, current, limit };
}
