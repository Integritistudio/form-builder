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

export function getPlanSelectionUrl(shopDomain) {
  const storeHandle = getStoreHandle(shopDomain);
  const appHandle = getAppHandle();
  return `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`;
}
