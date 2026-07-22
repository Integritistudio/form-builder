import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { forms } from "../db/schema.js";
import {
  getShopSettings,
  saveAffiliateCode,
  toShopWebhookMeta,
  updateShopProfile,
} from "../services/shop.js";
import {
  fetchShopWebhookInfo,
  isDevelopmentStore,
} from "../services/shop-context.js";
import {
  PLANS,
  getTotalFormLimit,
  getActiveFormLimit,
  getMonthlySubmissionLimit,
  getPlanFeatures,
} from "../services/plans.js";
import { countMonthlySubmissions } from "../services/submissionLimits.js";
import { sendAffiliateWebhook } from "../services/data-webhooks.js";

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

    const monthlySubmissions = await countMonthlySubmissions(shopDomain);
    const monthlySubmissionLimit = getMonthlySubmissionLimit(settings.plan);
    const session = res.locals.shopify.session;
    const developmentStore = await isDevelopmentStore(session);

    res.json({
      plan: settings.plan,
      developmentStore,
      plans: PLANS,
      features: getPlanFeatures(settings.plan),
      affiliateCode: settings.affiliateCode || null,
      usage: {
        totalForms: total,
        activeForms: active,
        totalFormLimit: getTotalFormLimit(settings.plan),
        activeFormLimit: getActiveFormLimit(settings.plan),
        monthlySubmissions,
        monthlySubmissionLimit,
      },
      smtpConfigured: Boolean(settings.smtpHost && settings.emailTo),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/affiliate", async (req, res) => {
  try {
    const shopDomain = getShop(res);
    const session = res.locals.shopify.session;
    const settings = await getShopSettings(shopDomain);

    if (settings.affiliateCode) {
      return res.status(409).json({
        error: "An affiliate code has already been saved for this store.",
        affiliateCode: settings.affiliateCode,
      });
    }

    const affiliateCode = String(req.body.affiliate_code || req.body.affiliateCode || "")
      .trim();

    if (!affiliateCode) {
      return res.status(400).json({ error: "Affiliate code is required." });
    }

    const shopInfo = await fetchShopWebhookInfo(session);
    await updateShopProfile(shopDomain, {
      shopName: shopInfo.shopName,
      shopifyShopId: shopInfo.shopifyShopId,
    });

    const freshSettings = await getShopSettings(shopDomain);
    const result = await sendAffiliateWebhook(
      {
        ...toShopWebhookMeta(freshSettings),
        shopUrl: shopInfo.shopUrl,
        shopName: shopInfo.shopName,
        shopifyShopId: shopInfo.shopifyShopId,
      },
      affiliateCode
    );

    if (!result.ok) {
      const message =
        result.error?.message ||
        "This affiliate code could not be applied.";
      const status =
        result.status === 409
          ? 409
          : result.status >= 400 && result.status < 500
            ? result.status
            : 400;

      return res.status(status).json({
        error: message,
        code: result.error?.code || null,
      });
    }

    const updated = await saveAffiliateCode(shopDomain, affiliateCode);

    res.json({
      success: true,
      affiliateCode: updated.affiliateCode,
      duplicate: Boolean(result.data?.duplicate),
      duplicateAttribution: Boolean(result.data?.duplicateAttribution),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
