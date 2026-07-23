import { createHmac, randomUUID } from "crypto";

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function joinUrl(base, path) {
  const root = trimSlash(base);
  if (!root || !path) return null;
  const suffix = String(path).startsWith("/") ? path : `/${path}`;
  return `${root}${suffix}`;
}

function shopKey(shopMeta = {}) {
  return (
    shopMeta.shopifyShopId ||
    shopMeta.shopify_shop_id ||
    shopMeta.shopUrl ||
    shopMeta.shop_url ||
    shopMeta.shopDomain ||
    "unknown"
  );
}

/** Prefer caller-supplied id; fall back to a stable key, then UUID last resort. */
export function resolveEventId(preferred, fallback) {
  if (preferred) return String(preferred);
  if (fallback) return String(fallback);
  return randomUUID();
}

export function getShopifyAppId() {
  return (
    process.env.SHOPIFY_APP_ID ||
    process.env.SHOPIFY_API_KEY ||
    process.env.CLIENT_ID ||
    ""
  );
}

export function getDataWebhookConfig() {
  const baseUrl = process.env.DATAWEBHOOK_URL || "";
  return {
    baseUrl,
    installUrl: joinUrl(baseUrl, process.env.APP_INSTALL_URL),
    uninstallUrl: joinUrl(baseUrl, process.env.APP_UNINSTALL_URL),
    affiliateUrl: joinUrl(baseUrl, process.env.AFFILIATE_URL),
    billingUrl: joinUrl(baseUrl, process.env.BILLING_URL),
    secret: process.env.WEBHOOK_SECRET || "",
  };
}

/**
 * Auth uses WEBHOOK_SECRET only (portal contract).
 * Prefer X-Webhook-Secret; HMAC is available as an alternate header keyed with the same secret.
 */
function buildAuthHeaders(rawBody) {
  const { secret } = getDataWebhookConfig();
  const headers = {
    "Content-Type": "application/json",
  };

  if (!secret) {
    return { headers, missingSecret: true };
  }

  // Prefer shared-secret header; also attach HMAC so either portal check succeeds.
  headers["X-Webhook-Secret"] = secret;
  headers["X-Shopify-Hmac-Sha256"] = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  return { headers, missingSecret: false };
}

export function buildShopPayload(shopMeta = {}, extras = {}) {
  return {
    shopify_app_id: getShopifyAppId(),
    shopify_shop_id: String(
      shopMeta.shopifyShopId || shopMeta.shopify_shop_id || ""
    ),
    shop_name: shopMeta.shopName || shopMeta.shop_name || "",
    shop_url: shopMeta.shopUrl || shopMeta.shop_url || shopMeta.shopDomain || "",
    ...extras,
  };
}

/**
 * POST JSON to an Integriti data webhook endpoint.
 * Returns { ok, status, data, error } without throwing on HTTP errors.
 */
export async function sendDataWebhook(url, payload) {
  if (!url) {
    return {
      ok: false,
      skipped: true,
      status: 0,
      data: null,
      error: { code: "NOT_CONFIGURED", message: "Data webhook URL is not configured." },
    };
  }

  const body = JSON.stringify(payload);
  const { headers, missingSecret } = buildAuthHeaders(body);

  if (missingSecret) {
    console.error(
      "Data webhook skipped: WEBHOOK_SECRET is not configured."
    );
    return {
      ok: false,
      skipped: true,
      status: 0,
      data: null,
      error: {
        code: "MISSING_SECRET",
        message: "WEBHOOK_SECRET is required for portal webhooks.",
      },
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    const data = await response.json().catch(() => ({}));
    const remoteOk = data?.success === true || data?.ok === true;
    const ok = response.ok && (data?.success === undefined || remoteOk);

    return {
      ok,
      status: response.status,
      data,
      error: ok
        ? null
        : data?.error || {
            code: "WEBHOOK_FAILED",
            message:
              data?.error?.message ||
              data?.message ||
              `Webhook request failed (${response.status})`,
          },
    };
  } catch (err) {
    console.error("Data webhook request failed:", err);
    return {
      ok: false,
      status: 0,
      data: null,
      error: {
        code: "NETWORK_ERROR",
        message: err.message || "Failed to reach data webhook",
      },
    };
  }
}

export async function sendInstallWebhook(shopMeta, { eventId } = {}) {
  const { installUrl } = getDataWebhookConfig();
  const key = shopKey(shopMeta);
  return sendDataWebhook(
    installUrl,
    buildShopPayload(shopMeta, {
      status: "installed",
      event_id: resolveEventId(eventId, `install-${key}`),
    })
  );
}

export async function sendUninstallWebhook(shopMeta, { eventId } = {}) {
  const { uninstallUrl } = getDataWebhookConfig();
  const key = shopKey(shopMeta);
  return sendDataWebhook(
    uninstallUrl,
    buildShopPayload(shopMeta, {
      event_id: resolveEventId(eventId, `uninstall-${key}`),
    })
  );
}

export async function sendAffiliateWebhook(shopMeta, affiliateCode, { eventId } = {}) {
  const { affiliateUrl } = getDataWebhookConfig();
  const code = String(affiliateCode || "").trim();
  const key = shopKey(shopMeta);
  return sendDataWebhook(
    affiliateUrl,
    buildShopPayload(shopMeta, {
      affiliate_code: code,
      event_id: resolveEventId(eventId, `affcode-${key}-${code}`),
    })
  );
}

export async function sendBillingWebhook(shopMeta, billingPayload, { eventId } = {}) {
  const { billingUrl } = getDataWebhookConfig();
  const key = shopKey(shopMeta);
  const type = billingPayload.event_type || "event";
  const paymentOrSub =
    billingPayload.shopify_payment_id ||
    billingPayload.shopify_subscription_id ||
    key;

  return sendDataWebhook(
    billingUrl,
    buildShopPayload(shopMeta, {
      ...billingPayload,
      event_id: resolveEventId(
        eventId || billingPayload.event_id,
        `${type}-${paymentOrSub}`
      ),
    })
  );
}
