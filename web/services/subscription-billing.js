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

function getReturnUrl() {
  const base = process.env.SHOPIFY_APP_URL || process.env.HOST;
  if (!base) {
    throw new Error("SHOPIFY_APP_URL is required for billing redirects");
  }
  return `${base.replace(/\/$/, "")}/plans`;
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

  const client = new shopify.api.clients.Graphql({ session });
  const response = await client.request(SUBSCRIPTION_CREATE, {
    variables: {
      name: plan.name,
      returnUrl: getReturnUrl(),
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
