import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  Stack,
  Badge,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useMutation, useQuery, useQueryClient } from "react-query";

import { apiFetch } from "../utils/api";

const PLAN_DETAILS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    features: ["Up to 3 active forms", "Unlimited submissions", "Email notifications", "Theme embed"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$15/mo",
    billingKey: "Pro",
    features: ["Unlimited forms", "Unlimited submissions", "Email notifications", "Theme embed"],
  },
  {
    key: "premium",
    name: "Premium",
    price: "$20/mo",
    billingKey: "Premium",
    features: ["Unlimited forms", "Unlimited submissions", "Email notifications", "Theme embed"],
  },
];

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(null);

  const { data, isLoading } = useQuery(["plan"], () => apiFetch("/api/plan"));

  const syncMutation = useMutation(() => apiFetch("/api/billing/status"), {
    onSuccess: () => queryClient.invalidateQueries(["plan"]),
  });

  const subscribeMutation = useMutation(
    (plan) =>
      apiFetch("/api/billing/subscribe", {
        method: "POST",
        body: JSON.stringify({ plan }),
      }),
    {
      onSuccess: (result) => {
        if (result.redirecting) {
          setMessage({
            status: "info",
            text: "Complete the billing approval in Shopify to activate your plan.",
          });
        } else {
          queryClient.invalidateQueries(["plan"]);
          setMessage({ status: "success", text: "Plan updated." });
        }
      },
      onError: (err) => setMessage({ status: "critical", text: err.message }),
    }
  );

  const currentPlan = data?.plan || "free";

  return (
    <Page title="Plans">
      <TitleBar title="Plans" />

      <Layout>
        {message && (
          <Layout.Section>
            <Banner status={message.status} onDismiss={() => setMessage(null)}>
              {message.text}
            </Banner>
          </Layout.Section>
        )}

        {data && (
          <Layout.Section>
            <Card sectioned>
              <Stack spacing="tight">
                <Text>
                  Current plan: <Badge>{currentPlan}</Badge>
                </Text>
                <Text color="subdued">
                  {data.usage.activeForms} active forms
                  {data.plan === "free" &&
                    ` of ${data.usage.formLimit} allowed`}
                </Text>
                <Button
                  size="slim"
                  loading={syncMutation.isLoading}
                  onClick={() => syncMutation.mutate()}
                >
                  Sync billing status
                </Button>
              </Stack>
            </Card>
          </Layout.Section>
        )}

        <Layout.Section>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {PLAN_DETAILS.map((plan) => {
              const isCurrent = currentPlan === plan.key;
              return (
                <Card key={plan.key} sectioned>
                  <Stack vertical spacing="loose">
                    <Stack vertical spacing="extraTight">
                      <Text variant="headingMd" as="h2">
                        {plan.name}
                      </Text>
                      <Text variant="headingLg" as="p">
                        {plan.price}
                      </Text>
                    </Stack>
                    <Stack vertical spacing="tight">
                      {plan.features.map((f) => (
                        <Text key={f} variant="bodySm">
                          {f}
                        </Text>
                      ))}
                    </Stack>
                    {isCurrent ? (
                      <Badge status="success">Current plan</Badge>
                    ) : plan.billingKey ? (
                      <Button
                        primary
                        loading={subscribeMutation.isLoading}
                        onClick={() => subscribeMutation.mutate(plan.billingKey)}
                      >
                        Upgrade to {plan.name}
                      </Button>
                    ) : (
                      <Text color="subdued" variant="bodySm">
                        Default plan
                      </Text>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
