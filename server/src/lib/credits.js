// Credit packages a broker can buy. Each listing costs 1 credit.
// Prices are display-only — there's no real payment integration yet.

export const CREDIT_PACKAGES = {
  small: { credits: 5, price: 50 },
  medium: { credits: 10, price: 90 },
  large: { credits: 20, price: 150 },
};

export const PACKAGE_IDS = Object.keys(CREDIT_PACKAGES);
