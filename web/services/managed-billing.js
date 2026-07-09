/** Plan keys must match Partner Dashboard public plan handles: free, pro, premium */
export const PAID_PLANS = ["pro", "premium"];

const PLAN_RANK = { free: 0, pro: 1, premium: 2 };

const PLAN_ALIASES = {
  peo: "pro",
  premium: "premium",
  pro: "pro",
  free: "free",
};

export function getAppHandle() {
  return process.env.SHOPIFY_APP_HANDLE || "formease";
}

export function getStoreHandle(shopDomain) {
  return shopDomain.replace(".myshopify.com", "");
}

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

/** Shopify App Pricing plan selection page (hosted by Shopify admin). */
export function getPlanSelectionUrl(shopDomain) {
  const appHandle = getAppHandle();
  const storeHandle = getStoreHandle(shopDomain);
  return `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
}

/** Break out of the embedded iframe before opening Shopify's hosted pricing page. */
export function getPlanSelectionExitUrl(shopDomain, { host } = {}) {
  const pricingUrl = getPlanSelectionUrl(shopDomain);
  const params = new URLSearchParams();
  params.set("redirectUri", pricingUrl);
  params.set("shop", shopDomain);
  if (host) {
    params.set("host", host);
  }
  return `/exitIframe?${params.toString()}`;
}
