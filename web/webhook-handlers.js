import { DeliveryMethod } from "@shopify/shopify-api";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { forms, submissions, shopSettings } from "./db/schema.js";
import {
  ensureShopSettings,
  markShopUninstalled,
  toShopWebhookMeta,
  updateShopPlan,
} from "./services/shop.js";
import { normalizePlanKey } from "./services/managed-billing.js";
import {
  sendBillingWebhook,
  sendUninstallWebhook,
} from "./services/data-webhooks.js";

const PLAN_PRICES = {
  pro: { amount: 9.99, currency: "USD" },
  premium: { amount: 14.99, currency: "USD" },
};

function subscriptionIdFromPayload(subscription) {
  return (
    subscription?.admin_graphql_api_id ||
    subscription?.id ||
    null
  );
}

/** App-specific webhooks (declared in shopify.app.toml, not registered via API). */
export const AppSpecificWebhookHandlers = {
  APP_SUBSCRIPTIONS_UPDATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, shop, body) => {
      try {
        const payload = JSON.parse(body);
        const subscription = payload.app_subscription || {};
        const status = subscription.status;
        const name = subscription.name;
        const settings = await ensureShopSettings(shop);
        const shopMeta = toShopWebhookMeta(settings);
        const previousPlan = settings.plan;

        if (status === "ACTIVE" && name) {
          const plan = normalizePlanKey(name);
          if (plan) {
            await updateShopPlan(shop, plan);

            if (previousPlan !== plan && previousPlan !== "free") {
              await sendBillingWebhook(shopMeta, {
                event_type: "plan_changed",
                shopify_subscription_id: subscriptionIdFromPayload(subscription),
                shopify_plan_id: plan,
                previous_shopify_plan_id: previousPlan,
              });
            } else if (previousPlan !== plan) {
              const price = PLAN_PRICES[plan];
              await sendBillingWebhook(shopMeta, {
                event_type: "subscription_activated",
                shopify_subscription_id: subscriptionIdFromPayload(subscription),
                shopify_plan_id: plan,
                ...(price || {}),
              });

              if (price) {
                await sendBillingWebhook(shopMeta, {
                  event_type: "payment_completed",
                  amount: price.amount,
                  currency: price.currency,
                  shopify_payment_id:
                    subscriptionIdFromPayload(subscription) ||
                    `pay_${shop}_${plan}`,
                  shopify_subscription_id: subscriptionIdFromPayload(subscription),
                  shopify_plan_id: plan,
                });
              }
            }
          }
        } else if (status === "CANCELLED" || status === "EXPIRED") {
          await updateShopPlan(shop, "free");
          await sendBillingWebhook(shopMeta, {
            event_type: "subscription_cancelled",
            shopify_subscription_id: subscriptionIdFromPayload(subscription),
            shopify_plan_id: previousPlan !== "free" ? previousPlan : undefined,
          });
        }
      } catch (err) {
        console.error("Subscription webhook error:", err);
      }
    },
  },

  APP_UNINSTALLED: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, shop) => {
      try {
        const settings = await ensureShopSettings(shop);
        const shopMeta = toShopWebhookMeta(settings);
        const result = await sendUninstallWebhook(shopMeta);
        if (!result.ok && !result.skipped) {
          console.error("Uninstall webhook rejected:", result.error || result.data);
        }
      } catch (err) {
        console.error("Uninstall data webhook error:", err);
      }

      await markShopUninstalled(shop);
    },
  },
};

/** Mandatory compliance handlers (shopify.app.toml only — cannot be API-registered). */
export const ComplianceWebhookHandlers = {
  CUSTOMERS_DATA_REQUEST: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async () => {},
  },

  CUSTOMERS_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async () => {},
  },

  SHOP_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, shop) => {
      await db.delete(submissions).where(eq(submissions.shopDomain, shop));
      await db.delete(forms).where(eq(forms.shopDomain, shop));
      await db.delete(shopSettings).where(eq(shopSettings.shopDomain, shop));
    },
  },
};

export const AllWebhookHandlers = {
  ...AppSpecificWebhookHandlers,
  ...ComplianceWebhookHandlers,
};
