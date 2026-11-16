// Boost ("featured listing") option matrix.
// Each option defines its credit cost and active duration in days.
//
// Spec didn't specify a duration for `badge`, so we default to 7 days
// (matches `premium` and the longer `top` variant). Adjust here to override.

export const BOOST_OPTIONS = {
  top_3:    { type: 'top',     durationDays: 3, cost: 30 },
  top_7:    { type: 'top',     durationDays: 7, cost: 60 },
  badge:    { type: 'badge',   durationDays: 7, cost: 20 },
  premium:  { type: 'premium', durationDays: 7, cost: 80 },
};

// Resolve a `{ type, duration_days? }` request into a concrete option.
// Returns the option, or null when the combination is invalid.
export function resolveBoost(type, durationDays) {
  if (type === 'top') {
    if (durationDays === 3) return BOOST_OPTIONS.top_3;
    if (durationDays === 7) return BOOST_OPTIONS.top_7;
    return null;
  }
  if (type === 'badge') return BOOST_OPTIONS.badge;
  if (type === 'premium') return BOOST_OPTIONS.premium;
  return null;
}

// Numeric tier used by listing-list ranking. Higher = ranked first.
// Returns 0 when boost is missing or expired.
export function activeBoostRank(listing, now = new Date()) {
  if (!listing?.isFeatured) return 0;
  if (listing.featuredUntil && new Date(listing.featuredUntil) <= now) return 0;
  if (listing.featureType === 'premium') return 3;
  if (listing.featureType === 'top') return 2;
  if (listing.featureType === 'badge') return 1;
  return 0;
}
