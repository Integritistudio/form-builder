import {
  BotActivityDetected,
  CookieNotFound,
  InvalidOAuthError,
} from "@shopify/shopify-api";
import { ensureExpiringOfflineSession } from "./lib/ensure-expiring-session.js";
import { fetchShopWebhookInfo } from "./services/shop-context.js";
import {
  ensureShopSettings,
  markInstallWebhookSent,
  shouldSendInstallWebhook,
  updateShopProfile,
} from "./services/shop.js";
import { sendInstallWebhook } from "./services/data-webhooks.js";

/**
 * OAuth callback without programmatic webhook registration.
 * All webhooks are app-specific and declared in shopify.app.toml (deploy with
 * `shopify app deploy`). Compliance topics cannot be registered via API (403).
 */
export async function completeOAuthCallback({ req, res, shopify, next }) {
  try {
    const callbackResponse = await shopify.api.auth.callback({
      rawRequest: req,
      rawResponse: res,
      expiring: true,
    });

    let session = callbackResponse.session;
    session = await ensureExpiringOfflineSession(shopify, session);

    await shopify.config.sessionStorage.storeSession(session);

    res.locals.shopify = {
      ...res.locals.shopify,
      session,
    };

    await notifyInstallIfNeeded(session).catch((err) => {
      console.error("Install data webhook failed:", err);
    });

    return next();
  } catch (error) {
    console.error("Failed to complete OAuth:", error);

    if (error instanceof InvalidOAuthError) {
      return res.status(400).send(error.message);
    }
    if (error instanceof CookieNotFound) {
      const shop = req.query.shop;
      if (shop) {
        return res.redirect(`${shopify.config.auth.path}?shop=${shop}`);
      }
      return res.redirect(shopify.config.auth.path);
    }
    if (error instanceof BotActivityDetected) {
      return res.status(410).send(error.message);
    }

    return res.status(500).send(error.message);
  }
}

async function notifyInstallIfNeeded(session) {
  const shopDomain = session.shop;
  const settings = await ensureShopSettings(shopDomain);
  const shopInfo = await fetchShopWebhookInfo(session);

  await updateShopProfile(shopDomain, {
    shopName: shopInfo.shopName,
    shopifyShopId: shopInfo.shopifyShopId,
  });

  if (!shouldSendInstallWebhook(settings)) {
    return;
  }

  const result = await sendInstallWebhook({
    shopDomain,
    shopUrl: shopInfo.shopUrl,
    shopName: shopInfo.shopName,
    shopifyShopId: shopInfo.shopifyShopId,
  });

  if (result.ok || result.data?.duplicate) {
    await markInstallWebhookSent(shopDomain);
  } else if (!result.skipped) {
    console.error("Install webhook rejected:", result.error || result.data);
  }
}
