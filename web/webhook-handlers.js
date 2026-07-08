import { DeliveryMethod } from "@shopify/shopify-api";
import { eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { forms, submissions, shopSettings } from "./db/schema.js";
import { updateShopPlan } from "./services/shop.js";

/** Handlers registered during OAuth (excludes mandatory compliance topics). */
export const RegisterableWebhookHandlers = {
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

/** Mandatory compliance handlers (Partner Dashboard / TOML only — not OAuth-registered). */
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
  ...RegisterableWebhookHandlers,
  ...ComplianceWebhookHandlers,
};
