import "./env.js";
import { ApiVersion, BillingInterval } from "@shopify/shopify-api";
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

// Plan names must match Shopify App Store public plans: free, pro, premium
const billingConfig = {
  pro: {
    amount: 9.99,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
  },
  premium: {
    amount: 14.99,
    currencyCode: "USD",
    interval: BillingInterval.Every30Days,
  },
};

const shopify = shopifyApp({
  api: {
    apiVersion: ApiVersion.July25,
    restResources,
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
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
