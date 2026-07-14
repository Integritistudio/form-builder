import shopify from "../shopify.js";
import { PLANS } from "./plans.js";

const SUBSCRIPTION_CREATE = `#graphql
  mutation AppSubscriptionCreate(
    $name: String!
    $returnUrl: URL!
    $test: Boolean!
    $lineItems: [AppSubscriptionLineItemInput!]!
  ) {
    appSubscriptionCreate(
      name: $name
      returnUrl: $returnUrl
      test: $test
      lineItems: $lineItems
    ) {
      confirmationUrl
      userErrors {
        field
        message
      }
    }
  }
`;

const SUBSCRIPTION_CANCEL = `#graphql
  mutation AppSubscriptionCancel($id: ID!) {
    appSubscriptionCancel(id: $id) {
      appSubscription {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * After charge approval Shopify redirects here. Must include shop (and host)
 * or ensureInstalledOnShop() responds with "No shop provided".
 */
function getReturnUrl(shop) {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const storeHandle = shop.replace(/\.myshopify\.com$/i, "");

  // Prefer the embedded Admin URL so the merchant lands back inside the app iframe.
  if (apiKey) {
    return `https://admin.shopify.com/store/${storeHandle}/apps/${apiKey}/plans`;
  }

  const base = process.env.SHOPIFY_APP_URL || process.env.HOST;
  if (!base) {
    throw new Error("SHOPIFY_APP_URL is required for billing redirects");
  }

  const host = Buffer.from(`${shop}/admin`).toString("base64");
  const params = new URLSearchParams({ shop, host });
  return `${base.replace(/\/$/, "")}/plans?${params.toString()}`;
}

/**
 * Create a Shopify subscription approval URL (test charge on dev stores).
 * Opens the standard "approve charge" screen instead of the hosted pricing page.
 */
export async function createSubscriptionConfirmationUrl(
  session,
  planKey,
  { isTest = true } = {}
) {
  const plan = PLANS[planKey];
  if (!plan || plan.price <= 0) {
    throw new Error("Invalid paid plan");
  }

  if (!session?.shop) {
    throw new Error("Shop is required for billing redirects");
  }

  const client = new shopify.api.clients.Graphql({ session });
  const response = await client.request(SUBSCRIPTION_CREATE, {
    variables: {
      name: plan.name,
      returnUrl: getReturnUrl(session.shop),
      test: isTest,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: plan.price,
                currencyCode: "USD",
              },
              interval: "EVERY_30_DAYS",
            },
          },
        },
      ],
    },
  });

  const payload = response.data?.appSubscriptionCreate;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(", "));
  }

  if (!payload?.confirmationUrl) {
    throw new Error("Shopify did not return a billing confirmation URL");
  }

  return payload.confirmationUrl;
}

/**
 * Cancel all active app subscriptions for the session shop.
 * Needed when downgrading to Free (or before switching paid plans via API).
 */
export async function cancelActiveSubscriptions(session, { isTest = true } = {}) {
  const { billing } = shopify.api;
  const result = await billing.check({
    session,
    isTest,
    returnObject: true,
  });

  const subscriptions = result.appSubscriptions || [];
  if (subscriptions.length === 0) {
    return { cancelled: 0 };
  }

  const client = new shopify.api.clients.Graphql({ session });
  let cancelled = 0;

  for (const subscription of subscriptions) {
    const response = await client.request(SUBSCRIPTION_CANCEL, {
      variables: { id: subscription.id },
    });

    const payload = response.data?.appSubscriptionCancel;
    const userErrors = payload?.userErrors ?? [];
    if (userErrors.length > 0) {
      throw new Error(userErrors.map((error) => error.message).join(", "));
    }

    cancelled += 1;
  }

  return { cancelled };
}
