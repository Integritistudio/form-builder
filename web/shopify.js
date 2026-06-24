import "./env.js";
import { BillingInterval, LATEST_API_VERSION } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { PostgreSQLSessionStorage } from "@shopify/shopify-app-session-storage-postgresql";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-10";
import { dbConfig } from "./env.js";

const db = dbConfig();

const sessionStorage = PostgreSQLSessionStorage.withCredentials(
  db.host,
  db.database,
  db.user,
  db.password,
  { port: db.port }
);

const billingConfig = {
  Pro: {
    amount: 15,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
  },
  Premium: {
    amount: 20,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
  },
};

const shopify = shopifyApp({
  api: {
    apiVersion: LATEST_API_VERSION,
    restResources,
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
    billing: billingConfig,
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage,
});

export default shopify;
