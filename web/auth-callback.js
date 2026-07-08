import {
  BotActivityDetected,
  CookieNotFound,
  InvalidOAuthError,
} from "@shopify/shopify-api";

/**
 * OAuth callback that completes install even if webhook registration fails.
 * Public apps must declare compliance webhooks in Partner Dashboard / TOML;
 * programmatic registration of mandatory topics can return 403.
 */
export async function completeOAuthCallback({ req, res, shopify, next }) {
  try {
    const callbackResponse = await shopify.api.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    await shopify.config.sessionStorage.storeSession(callbackResponse.session);

    if (!callbackResponse.session.isOnline) {
      try {
        await shopify.api.webhooks.register({
          session: callbackResponse.session,
        });
      } catch (webhookErr) {
        console.warn(
          `[webhooks] Registration failed during install for ${callbackResponse.session.shop}:`,
          webhookErr.message
        );
        console.warn(
          "[webhooks] Install continues. Run `shopify app deploy` and verify compliance webhook URLs in Partner Dashboard."
        );
      }
    }

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
