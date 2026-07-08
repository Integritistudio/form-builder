import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { forms } from "../db/schema.js";
import { getShopSettings } from "../services/shop.js";
import {
  PLANS,
  getTotalFormLimit,
  getActiveFormLimit,
  getPlanFeatures,
} from "../services/plans.js";

const router = Router();

function getShop(res) {
  return res.locals.shopify.session.shop;
}

router.get("/", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const settings = await getShopSettings(shopDomain);

    const [{ total }] = await db
      .select({ total: sql`COUNT(*)::int` })
      .from(forms)
      .where(eq(forms.shopDomain, shopDomain));

    const [{ active }] = await db
      .select({ active: sql`COUNT(*)::int` })
      .from(forms)
      .where(
        and(eq(forms.shopDomain, shopDomain), eq(forms.status, "active"))
      );

    res.json({
      plan: settings.plan,
      plans: PLANS,
      features: getPlanFeatures(settings.plan),
      usage: {
        totalForms: total,
        activeForms: active,
        totalFormLimit: getTotalFormLimit(settings.plan),
        activeFormLimit: getActiveFormLimit(settings.plan),
      },
      smtpConfigured: Boolean(settings.smtpHost && settings.emailTo),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
