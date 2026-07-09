import { Router } from "express";
import shopify from "../shopify.js";
import { updateShopPlan } from "../services/shop.js";
import {
  PAID_PLANS,
  getPlanSelectionExitUrl,
  resolvePlanFromSubscriptions,
} from "../services/managed-billing.js";

const router = Router();

function getShop(res) {
  return res.locals.shopify.session.shop;
}

function isBillingTest() {
  return process.env.BILLING_TEST !== "false";
}

async function getActiveBillingState(session) {
  const { billing } = shopify.api;
  const result = await billing.check({
    session,
    isTest: isBillingTest(),
    returnObject: true,
  });

  const plan = resolvePlanFromSubscriptions(result.appSubscriptions);

  return {
    plan,
    hasActivePayment: result.hasActivePayment,
    appSubscriptions: result.appSubscriptions,
  };
}

router.post("/subscribe", async (req, res) => {
  try {
    const requestedPlan = String(req.body.plan || "").toLowerCase();
    if (!PAID_PLANS.includes(requestedPlan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const session = res.locals.shopify.session;
    const shop = getShop(res);
    const { plan: currentPlan } = await getActiveBillingState(session);

    if (currentPlan === requestedPlan) {
      await updateShopPlan(shop, requestedPlan);
      return res.json({ success: true, plan: requestedPlan, alreadyActive: true });
    }

    res.json({
      success: true,
      confirmationUrl: getPlanSelectionExitUrl(shop, {
        host: typeof req.query.host === "string" ? req.query.host : undefined,
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error:
        err.message ||
        "Billing is unavailable. Confirm App Store pricing is configured in Partner Dashboard.",
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
    const { plan } = await getActiveBillingState(session);

    await updateShopPlan(shop, plan);

    res.json({ plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
