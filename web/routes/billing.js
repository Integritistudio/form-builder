import { Router } from "express";
import shopify from "../shopify.js";
import { updateShopPlan } from "../services/shop.js";

const router = Router();

function getShop(res) {
  return res.locals.shopify.session.shop;
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
    const hasPayment = await billing.check({
      session,
      plans: [plan],
      isTest: process.env.NODE_ENV !== "production",
    });

    if (hasPayment.hasActivePayment) {
      const planKey = plan.toLowerCase();
      await updateShopPlan(shop, planKey);
      return res.json({ success: true, plan: planKey, alreadyActive: true });
    }

    await billing.request({
      session,
      plan,
      isTest: process.env.NODE_ENV !== "production",
    });

    res.json({ success: true, redirecting: true });
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

    const proCheck = await billing.check({
      session,
      plans: ["Pro"],
      isTest: process.env.NODE_ENV !== "production",
    });

    const premiumCheck = await billing.check({
      session,
      plans: ["Premium"],
      isTest: process.env.NODE_ENV !== "production",
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
