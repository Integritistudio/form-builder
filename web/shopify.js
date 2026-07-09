import "./env.js";
import { ApiVersion } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { PostgreSQLSessionStorage } from "@shopify/shopify-app-session-storage-postgresql";
import { restResources } from "@shopify/shopify-api/rest/admin/2025-07";
import { dbConfig } from "./env.js";

const db = dbConfig();

const sessionStorage = PostgreSQLSessionStorage.withCredentials(
  db.host,
  db.database,
  db.user,
  db.password,
  { port: db.port }
);

const scopes = process.env.SCOPES.split(",").map((scope) => scope.trim());

const shopify = shopifyApp({
  api: {
    apiVersion: ApiVersion.July25,
    restResources,
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
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

console.log("[DEBUG] SHOPIFY_API_KEY prefix:", process.env.SHOPIFY_API_KEY?.slice(0, 10));
console.log("[DEBUG] SHOPIFY_API_SECRET prefix:", process.env.SHOPIFY_API_SECRET?.slice(0, 10));
console.log("[DEBUG] ApiVersion used:", ApiVersion.July25);
console.log("[DEBUG] HOST:", process.env.HOST);
console.log("[DEBUG] Scopes:", scopes.join(", "));
console.log("[DEBUG] OAuth requests expiring offline tokens: true");

export default shopify;
