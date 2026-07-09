/** Plan keys must match Partner Dashboard public plan handles: free, pro, premium */
export const PAID_PLANS = ["pro", "premium"];

const PLAN_RANK = { free: 0, pro: 1, premium: 2 };

const PLAN_ALIASES = {
  peo: "pro",
  premium: "premium",
  pro: "pro",
  free: "free",
};

export function normalizePlanKey(name) {
  const key = String(name || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
  return PLAN_ALIASES[key] ?? (PAID_PLANS.includes(key) ? key : null);
}

export function resolvePlanFromSubscriptions(appSubscriptions = []) {
  let plan = "free";

  for (const subscription of appSubscriptions) {
    const key = normalizePlanKey(subscription.name);
    if (!key || key === "free") continue;
    if (PLAN_RANK[key] > PLAN_RANK[plan]) {
      plan = key;
    }
  }

  return plan;
}

/** Shopify App Pricing plan selection (uses API key / client id, not app handle slug). */
export function getPlanSelectionUrl(shopDomain) {
  const appId = process.env.SHOPIFY_API_KEY;
  if (!appId) {
    throw new Error("SHOPIFY_API_KEY is required for billing redirects");
  }

  return `https://${shopDomain}/admin/billing/managed_pricing/plans?app_id=${appId}`;
}

/** Break out of the embedded iframe before opening Shopify's hosted pricing page. */
export function getPlanSelectionExitUrl(shopDomain) {
  const pricingUrl = getPlanSelectionUrl(shopDomain);
  return `/exitIframe?redirectUri=${encodeURIComponent(pricingUrl)}`;
}
