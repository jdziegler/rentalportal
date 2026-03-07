import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Re-export plan config and fees
export { PLANS, getPlanByPriceId, getPlanLimits } from "./plans";
export type { PlanKey } from "./plans";
export { CONNECT_FEES } from "./fees";
