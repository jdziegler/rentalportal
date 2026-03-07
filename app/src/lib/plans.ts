// Plan definitions — pure config, no Stripe SDK dependency

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null as string | null,
    limits: { units: 5, leases: 3 },
  },
  pro: {
    name: "Pro",
    price: 2900, // cents ($29/mo)
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    limits: { units: 250, leases: 100 },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanByPriceId(priceId: string | null): PlanKey {
  if (!priceId) return "free";
  if (priceId === PLANS.pro.priceId) return "pro";
  return "free";
}

export function getPlanLimits(priceId: string | null) {
  const plan = getPlanByPriceId(priceId);
  return PLANS[plan].limits;
}
