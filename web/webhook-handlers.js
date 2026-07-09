import { DeliveryMethod } from "@shopify/shopify-api";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { forms, submissions, shopSettings } from "./db/schema.js";
import { updateShopPlan } from "./services/shop.js";

/** App-specific webhooks (declared in shopify.app.toml, not registered via API). */
export const AppSpecificWebhookHandlers = {
  APP_SUBSCRIPTIONS_UPDATE: {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks",
    callback: async (_topic, shop, body) => {
      try {
        const payload = JSON.parse(body);
        const status = payload.app_subscription?.status;
        const name = payload.app_subscription?.name;

        if (status === "ACTIVE" && name) {
          const plan = name.toLowerCase().trim();
          const normalized =
            plan === "peo" ? "pro" : plan;
          if (["pro", "premium"].includes(normalized)) {
            await updateShopPlan(shop, normalized);
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
