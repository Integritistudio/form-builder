import { DeliveryMethod } from "@shopify/shopify-api";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { forms, submissions, shopSettings } from "./db/schema.js";
import { updateShopPlan } from "./services/shop.js";

/**
 * @type {{[key: string]: import("@shopify/shopify-api").WebhookHandler}}
 */
export default {
  CUSTOMERS_DATA_REQUEST: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, _shop, _body, _webhookId) => {},
  },

  CUSTOMERS_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, _shop, _body, _webhookId) => {},
  },

  SHOP_REDACT: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, shop, _body, _webhookId) => {
      await db.delete(submissions).where(eq(submissions.shopDomain, shop));
      await db.delete(forms).where(eq(forms.shopDomain, shop));
      await db.delete(shopSettings).where(eq(shopSettings.shopDomain, shop));
    },
  },

  APP_SUBSCRIPTIONS_UPDATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, shop, body) => {
      try {
        const payload = JSON.parse(body);
        const status = payload.app_subscription?.status;
        const name = payload.app_subscription?.name;

        if (status === "ACTIVE" && name) {
          const plan = name.toLowerCase();
          if (["pro", "premium"].includes(plan)) {
            await updateShopPlan(shop, plan);
          }
        } else if (status === "CANCELLED" || status === "EXPIRED") {
          await updateShopPlan(shop, "free");
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
      await updateShopPlan(shop, "free");
    },
  },
};
