import { getInstalledAppHandle } from "./shop-context.js";

/** Plan keys must match Shopify App Pricing public plan handles: free, pro, premium */
export const PAID_PLANS = ["pro", "premium"];

const PLAN_RANK = { free: 0, pro: 1, premium: 2 };

const PLAN_ALIASES = {
  peo: "pro",
  premium: "premium",
  pro: "pro",
  free: "free",
};

export function getConfiguredAppHandle() {
  return process.env.SHOPIFY_APP_HANDLE || "formease";
}

export function getStoreHandle(shopDomain) {
  return shopDomain.replace(".myshopify.com", "");
}

/**
 * Billing URLs use the handle from shopify.app.toml / SHOPIFY_APP_HANDLE.
 * The Admin API app.handle can differ and leads to pricing_plans 404s.
 */
export async function resolveAppHandle(_session) {
  return getConfiguredAppHandle();
}

export async function getInstalledAppHandleForDebug(session) {
  return getInstalledAppHandle(session);
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

/** Build Shopify App Pricing redirect targets for a shop. */
export async function getPlanSelectionTargets(session, shopDomain) {
  const appHandle = await resolveAppHandle(session);
  const apiHandle = session ? await getInstalledAppHandle(session) : null;
  const storeHandle = getStoreHandle(shopDomain);
  const appId = process.env.SHOPIFY_API_KEY;

  return {
    appHandle,
    apiHandle,
    shopifyUrl: `shopify://admin/charges/${appHandle}/pricing_plans`,
    pricingUrl: `https://admin.shopify.com/store/${storeHandle}/charges/${appHandle}/pricing_plans`,
    shopPricingUrl: `https://${shopDomain}/admin/charges/${appHandle}/pricing_plans`,
    legacyManagedUrl: appId
      ? `https://${shopDomain}/admin/billing/managed_pricing/plans?app_id=${appId}`
      : null,
  };
}

/** Preferred URL for embedded apps (App Bridge / admin deep link). */
export async function getPlanSelectionUrl(session, shopDomain) {
  const targets = await getPlanSelectionTargets(session, shopDomain);
  return targets.shopifyUrl;
}

/** Break out of the embedded iframe before opening Shopify's hosted pricing page. */
export async function getPlanSelectionExitUrl(session, shopDomain, { host } = {}) {
  const targets = await getPlanSelectionTargets(session, shopDomain);
  const params = new URLSearchParams();
  params.set("redirectUri", targets.pricingUrl);
  params.set("shop", shopDomain);
  if (host) {
    params.set("host", host);
  }
  params.set("embedded", "1");
  return `/exitIframe?${params.toString()}`;
}
