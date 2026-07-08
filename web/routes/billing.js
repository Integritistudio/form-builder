import { Router } from "express";
import shopify from "../shopify.js";
import { updateShopPlan } from "../services/shop.js";

const router = Router();

function getShop(res) {
  return res.locals.shopify.session.shop;
}

function isBillingTest() {
  return process.env.BILLING_TEST !== "false";
}

function getReturnUrl() {
  const host = process.env.HOST || process.env.SHOPIFY_APP_URL || "";
  const base = host.startsWith("http") ? host : `https://${host}`;
  return `${base.replace(/\/$/, "")}/plans`;
}

router.post("/subscribe", async (req, res) => {
  try {
    const plan = req.body.plan;
    if (!["Pro", "Premium"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const session = res.locals.shopify.session;
    const shop = getShop(res);
    const { billing } = shopify.api;
    const isTest = isBillingTest();

    const hasPayment = await billing.check({
      session,
      plans: [plan],
      isTest,
    });

    if (hasPayment.hasActivePayment) {
      const planKey = plan.toLowerCase();
      await updateShopPlan(shop, planKey);
      return res.json({ success: true, plan: planKey, alreadyActive: true });
    }

    const billingResponse = await billing.request({
      session,
      plan,
      isTest,
      returnUrl: getReturnUrl(),
    });

    res.json({
      success: true,
      confirmationUrl: billingResponse.confirmationUrl,
    });
  } catch (err) {
    console.error(err);
    const billingMsg = err.errorData?.[0]?.message;
    res.status(500).json({
      error:
        billingMsg ||
        err.message ||
        "Billing is unavailable for this app during development.",
    });
  }
});

router.post("/dev/activate", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ error: "Not available in production." });
    }

    const plan = String(req.body.plan || "").toLowerCase();
    if (!["free", "pro", "premium"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    await updateShopPlan(getShop(res), plan);
    res.json({ success: true, plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/status", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const shop = getShop(res);
    const { billing } = shopify.api;
    const isTest = isBillingTest();

    const proCheck = await billing.check({
      session,
      plans: ["Pro"],
      isTest,
    });

    const premiumCheck = await billing.check({
      session,
      plans: ["Premium"],
      isTest,
    });

    let plan = "free";
    if (premiumCheck.hasActivePayment) plan = "premium";
    else if (proCheck.hasActivePayment) plan = "pro";

    await updateShopPlan(shop, plan);

    res.json({ plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
