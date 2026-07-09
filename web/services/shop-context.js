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
