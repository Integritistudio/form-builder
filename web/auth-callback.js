import {
  BotActivityDetected,
  CookieNotFound,
  InvalidOAuthError,
} from "@shopify/shopify-api";
import { describeSession } from "./lib/session-debug.js";
import { ensureExpiringOfflineSession } from "./lib/ensure-expiring-session.js";

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

    const sessionInfo = describeSession(session);
    console.log("[auth] OAuth completed:", sessionInfo);
    if (!sessionInfo.hasRefreshToken) {
      console.warn(
        "[auth] Still no refresh token after expiring OAuth. Check Shopify library version and reinstall the app."
      );
    }

    res.locals.shopify = {
      ...res.locals.shopify,
      session,
    };

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
