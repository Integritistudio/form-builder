import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { shopSettings } from "../db/schema.js";

export async function ensureShopSettings(shopDomain) {
  const existing = await db
    .select()
    .from(shopSettings)
    .where(eq(shopSettings.shopDomain, shopDomain))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(shopSettings)
    .values({ shopDomain, plan: "free" })
    .returning();

  return created;
}

export async function getShopSettings(shopDomain) {
  return ensureShopSettings(shopDomain);
}

export async function updateShopPlan(shopDomain, plan) {
  await ensureShopSettings(shopDomain);
  const [updated] = await db
    .update(shopSettings)
    .set({ plan, updatedAt: new Date() })
    .where(eq(shopSettings.shopDomain, shopDomain))
    .returning();
  return updated;
}

export function toShopWebhookMeta(settings) {
  return {
    shopDomain: settings.shopDomain,
    shopUrl: settings.shopDomain,
    shopName: settings.shopName || settings.shopDomain,
    shopifyShopId: settings.shopifyShopId || settings.shopDomain,
  };
}

export async function updateShopProfile(shopDomain, { shopName, shopifyShopId } = {}) {
  await ensureShopSettings(shopDomain);
  const updates = { updatedAt: new Date() };
  if (shopName !== undefined) updates.shopName = shopName || null;
  if (shopifyShopId !== undefined) updates.shopifyShopId = shopifyShopId || null;

  const [updated] = await db
    .update(shopSettings)
    .set(updates)
    .where(eq(shopSettings.shopDomain, shopDomain))
    .returning();
  return updated;
}

export async function markInstallWebhookSent(shopDomain) {
  const [updated] = await db
    .update(shopSettings)
    .set({
      installWebhookSentAt: new Date(),
      uninstalledAt: null,
      updatedAt: new Date(),
    })
    .where(eq(shopSettings.shopDomain, shopDomain))
    .returning();
  return updated;
}

export async function markShopUninstalled(shopDomain) {
  const [updated] = await db
    .update(shopSettings)
    .set({
      plan: "free",
      uninstalledAt: new Date(),
      // Keep affiliateCode so referral survives reinstall (portal contract).
      installWebhookSentAt: null,
      updatedAt: new Date(),
    })
    .where(eq(shopSettings.shopDomain, shopDomain))
    .returning();
  return updated;
}

export async function saveAffiliateCode(shopDomain, affiliateCode) {
  const [updated] = await db
    .update(shopSettings)
    .set({
      affiliateCode,
      updatedAt: new Date(),
    })
    .where(eq(shopSettings.shopDomain, shopDomain))
    .returning();
  return updated;
}

export function shouldSendInstallWebhook(settings) {
  return !settings.installWebhookSentAt || Boolean(settings.uninstalledAt);
}
