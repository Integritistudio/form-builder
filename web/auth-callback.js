import {
  BotActivityDetected,
  CookieNotFound,
  InvalidOAuthError,
} from "@shopify/shopify-api";

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
    });

    await shopify.config.sessionStorage.storeSession(callbackResponse.session);

    res.locals.shopify = {
      ...res.locals.shopify,
      session: callbackResponse.session,
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
