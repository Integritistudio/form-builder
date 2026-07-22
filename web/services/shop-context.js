import shopify from "../shopify.js";

const DEVELOPMENT_STORE_QUERY = `#graphql
  query ShopPlan {
    shop {
      plan {
        partnerDevelopment
      }
    }
  }
`;

const APP_HANDLE_QUERY = `#graphql
  query InstalledAppHandle {
    currentAppInstallation {
      app {
        handle
      }
    }
  }
`;

const SHOP_INFO_QUERY = `#graphql
  query ShopWebhookInfo {
    shop {
      id
      name
      myshopifyDomain
    }
  }
`;

export async function isDevelopmentStore(session) {
  try {
    const client = new shopify.api.clients.Graphql({ session });
    const response = await client.request(DEVELOPMENT_STORE_QUERY);
    return response.data?.shop?.plan?.partnerDevelopment === true;
  } catch {
    return false;
  }
}

export async function getInstalledAppHandle(session) {
  try {
    const client = new shopify.api.clients.Graphql({ session });
    const response = await client.request(APP_HANDLE_QUERY);
    return response.data?.currentAppInstallation?.app?.handle || null;
  } catch {
    return null;
  }
}

export async function fetchShopWebhookInfo(session) {
  const fallback = {
    shopifyShopId: session.shop,
    shopName: session.shop,
    shopUrl: session.shop,
  };

  try {
    const client = new shopify.api.clients.Graphql({ session });
    const response = await client.request(SHOP_INFO_QUERY);
    const shop = response.data?.shop;
    if (!shop) return fallback;

    return {
      shopifyShopId: shop.id || session.shop,
      shopName: shop.name || session.shop,
      shopUrl: shop.myshopifyDomain || session.shop,
    };
  } catch (err) {
    console.error("Failed to fetch shop info for webhooks:", err);
    return fallback;
  }
}

