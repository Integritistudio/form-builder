import { Router } from "express";
import shopify from "../shopify.js";
import { updateShopPlan } from "../services/shop.js";
import {
  PAID_PLANS,
  getPlanSelectionExitUrl,
  getPlanSelectionTargets,
  normalizePlanKey,
  resolvePlanFromSubscriptions,
} from "../services/managed-billing.js";

const router = Router();

const PLAN_RANK = { free: 0, pro: 1, premium: 2 };
const ALL_PLANS = ["free", "pro", "premium"];

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

async function respondWithPricingPage(res, session, shop, req, extras = {}) {
  const host = typeof req.body?.host === "string" ? req.body.host : null;
  const targets = await getPlanSelectionTargets(session, shop);
  const exitUrl = await getPlanSelectionExitUrl(session, shop, { host });

  res.json({
    success: true,
    billingMethod: "shopify_app_pricing",
    exitUrl,
    ...targets,
    ...extras,
  });
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

    await respondWithPricingPage(res, session, shop, req, {
      targetPlan: requestedPlan,
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

router.post("/downgrade", async (req, res) => {
  try {
    const requestedPlan = String(req.body.plan || "").toLowerCase();
    if (!ALL_PLANS.includes(requestedPlan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const session = res.locals.shopify.session;
    const shop = getShop(res);
    const { plan: currentPlan } = await getActiveBillingState(session);

    if (PLAN_RANK[requestedPlan] >= PLAN_RANK[currentPlan]) {
      return res.status(400).json({
        error: "Use upgrade to move to a higher plan.",
      });
    }

    if (currentPlan === requestedPlan) {
      await updateShopPlan(shop, requestedPlan);
      return res.json({ success: true, plan: requestedPlan, alreadyActive: true });
    }

    await respondWithPricingPage(res, session, shop, req, {
      targetPlan: requestedPlan,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Unable to change plan.",
    });
  }
});

router.post("/dev/activate", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "Use Shopify billing to change plans in production.",
      });
    }

    const plan = String(req.body.plan || "").toLowerCase();
    if (!ALL_PLANS.includes(plan)) {
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

    if (typeof req.query.plan_handle === "string") {
      const plan = normalizePlanKey(req.query.plan_handle);
      if (plan) {
        await updateShopPlan(shop, plan);
      }
    }

    const { plan } = await getActiveBillingState(session);

    await updateShopPlan(shop, plan);

    res.json({ plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
