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

export function getShopifyAppId() {
  return process.env.SHOPIFY_API_KEY || process.env.CLIENT_ID || "";
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

function buildAuthHeaders(rawBody) {
  const { secret } = getDataWebhookConfig();
  const headers = {
    "Content-Type": "application/json",
  };

  if (secret) {
    headers["X-Webhook-Secret"] = secret;
    return headers;
  }

  const hmacKey =
    process.env.SHOPIFY_API_SECRET || process.env.CLIENT_SECRET || "";
  if (hmacKey) {
    headers["X-Shopify-Hmac-Sha256"] = createHmac("sha256", hmacKey)
      .update(rawBody, "utf8")
      .digest("base64");
  }

  return headers;
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
  const headers = buildAuthHeaders(body);

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
  return sendDataWebhook(
    installUrl,
    buildShopPayload(shopMeta, {
      status: "installed",
      event_id: eventId || `install_${shopMeta.shopUrl || shopMeta.shopDomain}_${randomUUID()}`,
    })
  );
}

export async function sendUninstallWebhook(shopMeta, { eventId } = {}) {
  const { uninstallUrl } = getDataWebhookConfig();
  return sendDataWebhook(
    uninstallUrl,
    buildShopPayload(shopMeta, {
      event_id:
        eventId ||
        `uninstall_${shopMeta.shopUrl || shopMeta.shopDomain}_${randomUUID()}`,
    })
  );
}

export async function sendAffiliateWebhook(shopMeta, affiliateCode, { eventId } = {}) {
  const { affiliateUrl } = getDataWebhookConfig();
  return sendDataWebhook(
    affiliateUrl,
    buildShopPayload(shopMeta, {
      affiliate_code: String(affiliateCode || "").trim(),
      event_id:
        eventId ||
        `aff_${shopMeta.shopUrl || shopMeta.shopDomain}_${randomUUID()}`,
    })
  );
}

export async function sendBillingWebhook(shopMeta, billingPayload, { eventId } = {}) {
  const { billingUrl } = getDataWebhookConfig();
  return sendDataWebhook(
    billingUrl,
    buildShopPayload(shopMeta, {
      ...billingPayload,
      event_id:
        eventId ||
        `billing_${billingPayload.event_type || "event"}_${shopMeta.shopUrl || shopMeta.shopDomain}_${randomUUID()}`,
    })
  );
}
