// @ts-check
import "./env.js";
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import { completeOAuthCallback } from "./auth-callback.js";
import { AllWebhookHandlers } from "./webhook-handlers.js";
import { describeSession } from "./lib/session-debug.js";
import { runMigrations } from "./db/migrate.js";
import formsRouter from "./routes/forms.js";
import settingsRouter from "./routes/settings.js";
import planRouter from "./routes/plan.js";
import billingRouter from "./routes/billing.js";
import publicRouter from "./routes/public.js";
import submissionsRouter from "./routes/submissions.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

app.set("trust proxy", 1);

await runMigrations();

app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  (req, res, next) => completeOAuthCallback({ req, res, shopify, next }),
  shopify.redirectToShopifyOrAppRoot()
);

const webhookMiddleware = shopify.processWebhooks({
  webhookHandlers: AllWebhookHandlers,
});
console.log(
  "[webhooks] Handler topics:",
  Object.keys(AllWebhookHandlers).join(", ")
);
app.post(shopify.config.webhooks.path, ...webhookMiddleware);

app.use(express.json());

app.use("/apps/integriti-forms", publicRouter);

const validateAuthenticatedSession = shopify.validateAuthenticatedSession();

app.use("/api", (req, res, next) => {
  validateAuthenticatedSession(req, res, (err) => {
    if (err) {
      console.error("[session] API auth middleware error:", {
        path: req.path,
        method: req.method,
        shop:
          req.query.shop ||
          req.headers["x-shopify-shop-domain"] ||
          req.headers["x-shopify-shop"],
        message: err.message,
        hint:
          "403 usually means a non-expiring offline token on a public app. Uninstall and reinstall after deploying expiringOfflineAccessTokens.",
      });
      if (!res.headersSent) {
        res.status(500).json({
          error: "Session validation failed",
          message: err.message,
        });
      }
      return;
    }

    if (!res.headersSent) {
      console.log("[session] API request authorized:", {
        path: req.path,
        method: req.method,
        ...describeSession(res.locals.shopify?.session),
      });
      next();
    }
  });
});

app.use("/api/forms", formsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/plan", planRouter);
app.use("/api/billing", billingRouter);
app.use("/api/submissions", submissionsRouter);

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/{*splat}", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.use((err, req, res, _next) => {
  console.error("[app] Unhandled error:", {
    path: req.path,
    method: req.method,
    message: err.message,
    hint:
      err.message?.includes("403 Forbidden")
        ? "Public apps require expiring offline tokens. Uninstall/reinstall the app after deploy."
        : undefined,
  });

  if (!res.headersSent) {
    res.status(500).json({ error: err.message });
  }
});

process.on("unhandledRejection", (reason) => {
  const message =
    reason instanceof Error ? reason.message : String(reason ?? "unknown");
  console.error("[app] Unhandled rejection:", {
    message,
    hint:
      message.includes("403 Forbidden")
        ? "Public apps require expiring offline tokens. Uninstall/reinstall the app after deploy."
        : undefined,
  });
});

app.listen(PORT);
