// Stripe Connect fee settings (separated from stripe.ts to allow importing without Stripe client)
export const CONNECT_FEES = {
  ach: 195, // $1.95 flat fee in cents
  card_percent: 3.5, // 3.5%
  card_fixed: 30, // $0.30 in cents
};
