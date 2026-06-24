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
