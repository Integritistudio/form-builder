import shopify from "../shopify.js";

const DEFAULT_URL =
  "https://services.leadconnectorhq.com/hooks/v7dTXJkjV4Kul650VWdt/webhook-trigger/51777a9a-12c1-4f16-9309-341be07edb7d";

const SHOP_QUERY = `#graphql
  query SlideEaseShopIdentity {
    shop {
      id
      name
      myshopifyDomain
      contactEmail
      billingAddress {
        city
        province
        country
        phone
      }
    }
  }
`;

function normalizeContactValue(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

export function normalizeShopDomain(shop) {
  return String(shop || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "");
}

export async function ensureShopIdentity(session) {
  const identity = await fetchShopIdentity(session);
  const shop = identity?.shop || normalizeShopDomain(session?.shop);
  if (!shop) return null;
  return true;
}

export async function fetchShopIdentity(session) {
  if (!session) return null;
  try {
    const client = new shopify.api.clients.Graphql({ session });
    const response = await client.request(SHOP_QUERY);
    const shop = response?.data?.shop;
    if (!shop) return null;
    const address = shop.billingAddress || {};
    const location =
      [address.city, address.province, address.country]
        .filter(Boolean)
        .join(", ") || null;

    return {
      shopifyShopId: shop.id,
      shopName: shop.name,
      shop: normalizeShopDomain(shop.myshopifyDomain || session.shop),
      contactEmail: shop.contactEmail || null,
      phone: address.phone || null,
      location,
    };
  } catch (error) {
    console.warn("fetchShopIdentity failed:", error?.message || error);
    return {
      shopifyShopId: null,
      shopName: null,
      shop: normalizeShopDomain(session.shop),
      contactEmail: null,
      phone: null,
      location: null,
    };
  }
}

/** Best-effort notification; an external outage must not break OAuth or cleanup. */
export async function sendLifecycleWebhook(
  eventName,
  { fetchImpl = globalThis.fetch, contact = {} } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  const payload = {
    app_name: "Bookify",
    event_name: eventName,
  };

  const contactEmail = normalizeContactValue(
    contact?.email ?? contact?.contact_email ?? contact?.contactEmail,
  );
  const contactPhone = normalizeContactValue(
    contact?.phone ?? contact?.contact_phone ?? contact?.contactPhone,
  );
  const contactLocation = normalizeContactValue(
    contact?.location ?? contact?.contact_location ?? contact?.locationName,
  );

  if (contactEmail) payload.contact_email = contactEmail;
  if (contactPhone) payload.contact_phone = contactPhone;
  if (contactLocation) payload.location = contactLocation;
  console.log(`[lifecycle] sending ${eventName} notification`, {
    contact_email: contactEmail,
    contact_phone: contactPhone,
    location: contactLocation,
  });
  try {
    const response = await fetchImpl(
      process.env.LEADCONNECTOR_WEBHOOK_URL || DEFAULT_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
    // Consume the body to release the connection without logging external content.
    await response.text();
    if (!response.ok) {
      console.log(
        `[lifecycle] ${eventName} notification failed: HTTP ${response.status}`,
      );
    }
    return response.ok;
  } catch (error) {
    console.log(
      `[lifecycle] ${eventName} notification failed:`,
      error?.message || error,
    );
    return false;
  } finally {
    clearTimeout(timer);
    console.log(`[lifecycle] ${eventName} notification sent (or timed out)`);
  }
}

export async function afterAuth(req, res, next) {
  try {
    const session = res.locals.shopify?.session;
    if (!session) {
      return next();
    }

    try {
      const row = await ensureShopIdentity(session);
      const identity = await fetchShopIdentity(session);
      if (row) {
        const contact = {
          email: identity?.contactEmail || null,
          phone: identity?.phone || null,
          location: identity?.location || null,
        };

        if (row.installStatus !== "installed" || !row.installEventId) {
          await sendLifecycleWebhook("installed", { contact });
        }
      }
    } catch (error) {
      console.log(
        "afterAuth shop/portal setup failed:",
        error?.message || error,
      );
    }
  } catch (error) {
    console.log("afterAuth error:", error?.message || error);
  }
  return next();
}
