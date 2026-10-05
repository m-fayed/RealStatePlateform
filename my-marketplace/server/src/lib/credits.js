// Credit packages a broker can buy. Each listing costs 1 credit.
// Prices are in EGP. These are the single source of truth the purchase
// endpoint validates against — the frontend mirrors them for display only.

export const CREDIT_PACKAGES = {
  small: { credits: 5, price: 50 },
  medium: { credits: 10, price: 90 },
  large: { credits: 20, price: 150 },
};

export const PACKAGE_IDS = Object.keys(CREDIT_PACKAGES);

// Payment methods, tailored for the Egyptian market.
//   vodafone_cash — real, manual. Broker transfers to our wallet and we verify
//                   the transfer by hand; credits are granted only once an admin
//                   approves the pending request.
//   card / fawry  — mock sandbox. No real processor is wired yet; these confirm
//                   instantly so the end-to-end flow can be tested without a
//                   payment gateway. `instant: true` marks that behaviour.
export const PAYMENT_METHODS = {
  vodafone_cash: { instant: false },
  card: { instant: true },
  fawry: { instant: true },
};

export const PAYMENT_METHOD_IDS = Object.keys(PAYMENT_METHODS);

// Our Vodafone Cash wallet brokers transfer to. Surfaced to the client via
// GET /api/credits/packages so the number lives in one place.
export const VODAFONE_CASH_WALLET = '01066329241';
