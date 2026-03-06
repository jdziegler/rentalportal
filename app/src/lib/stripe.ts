import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Subscription plans
export const PLANS = {
  starter: {
    name: "Starter",
    price: 1800, // cents
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    limits: { units: 25, leases: 10, storage: 1 },
  },
  growth: {
    name: "Growth",
    price: 2900,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID!,
    limits: { units: 75, leases: 30, storage: 10 },
  },
  pro: {
    name: "Pro",
    price: 5000,
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    limits: { units: 250, leases: 60, storage: 25 },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// Stripe Connect fee settings
export const CONNECT_FEES = {
  ach: 195, // $1.95 flat fee in cents
  card_percent: 3.5, // 3.5%
  card_fixed: 30, // $0.30 in cents
};
