import { Router } from "express";
import shopify from "../shopify.js";
import { updateShopPlan } from "../services/shop.js";
import { isDevelopmentStore } from "../services/shop-context.js";
import {
  cancelActiveSubscriptions,
  createSubscriptionConfirmationUrl,
} from "../services/subscription-billing.js";
import {
  PAID_PLANS,
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

    const developmentStore = await isDevelopmentStore(session);
    const isTest = developmentStore || isBillingTest();
    const targets = await getPlanSelectionTargets(session, shop);

    if (developmentStore) {
      try {
        // Cancel higher/other plans first so downgrades resolve correctly.
        if (PLAN_RANK[requestedPlan] < PLAN_RANK[currentPlan]) {
          await cancelActiveSubscriptions(session, { isTest: true });
        }

        const confirmationUrl = await createSubscriptionConfirmationUrl(
          session,
          requestedPlan,
          { isTest: true }
        );
        return res.json({
          success: true,
          confirmationUrl,
          isTestCharge: true,
          billingMethod: "subscription_create",
        });
      } catch (subscriptionError) {
        console.warn(
          "Dev store subscription create failed, falling back to pricing URLs:",
          subscriptionError.message
        );
      }
    }

    res.json({
      success: true,
      appHandle: targets.appHandle,
      apiHandle: targets.apiHandle,
      confirmationUrl: null,
      legacyManagedUrl: targets.legacyManagedUrl,
      shopifyUrl: targets.shopifyUrl,
      pricingUrl: targets.pricingUrl,
      shopPricingUrl: targets.shopPricingUrl,
      isTestCharge: isTest,
      billingMethod: "managed_pricing",
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

    const developmentStore = await isDevelopmentStore(session);
    const isTest = developmentStore || isBillingTest();
    const targets = await getPlanSelectionTargets(session, shop);

    // Free: cancel active Shopify subscriptions and set local plan.
    if (requestedPlan === "free") {
      if (developmentStore) {
        try {
          await cancelActiveSubscriptions(session, { isTest: true });
          await updateShopPlan(shop, "free");
          return res.json({
            success: true,
            plan: "free",
            billingMethod: "subscription_cancel",
          });
        } catch (cancelError) {
          console.warn(
            "Dev store subscription cancel failed, falling back to pricing URLs:",
            cancelError.message
          );
        }
      }

      // Production / managed pricing: merchant cancels via Shopify pricing page.
      return res.json({
        success: true,
        confirmationUrl: null,
        legacyManagedUrl: targets.legacyManagedUrl,
        shopifyUrl: targets.shopifyUrl,
        pricingUrl: targets.pricingUrl,
        shopPricingUrl: targets.shopPricingUrl,
        isTestCharge: isTest,
        billingMethod: "managed_pricing",
        targetPlan: "free",
      });
    }

    // Paid downgrade (e.g. Premium → Pro): same charge / pricing flow as subscribe.
    if (developmentStore) {
      try {
        await cancelActiveSubscriptions(session, { isTest: true });
        const confirmationUrl = await createSubscriptionConfirmationUrl(
          session,
          requestedPlan,
          { isTest: true }
        );
        return res.json({
          success: true,
          confirmationUrl,
          isTestCharge: true,
          billingMethod: "subscription_create",
          targetPlan: requestedPlan,
        });
      } catch (subscriptionError) {
        console.warn(
          "Dev store downgrade subscription create failed, falling back to pricing URLs:",
          subscriptionError.message
        );
      }
    }

    res.json({
      success: true,
      confirmationUrl: null,
      legacyManagedUrl: targets.legacyManagedUrl,
      shopifyUrl: targets.shopifyUrl,
      pricingUrl: targets.pricingUrl,
      shopPricingUrl: targets.shopPricingUrl,
      isTestCharge: isTest,
      billingMethod: "managed_pricing",
      targetPlan: requestedPlan,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Unable to downgrade plan.",
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
