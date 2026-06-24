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
  SkeletonBodyText,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useMutation, useQuery, useQueryClient } from "react-query";

import { apiFetch } from "../utils/api";

const PLAN_DETAILS = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    features: [
      "Up to 3 active forms",
      "Unlimited submissions",
      "Email notifications",
      "Theme embed",
      "Basic form styling",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$15/mo",
    features: [
      "Unlimited forms",
      "Image file uploads",
      "Custom CSS",
      "Gradient colors",
      "Header & title styling",
      "Email notifications with attachments",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "$20/mo",
    features: [
      "Everything in Pro",
      "PDF & Word document uploads",
      "Images + documents (no zip files)",
      "Priority support",
    ],
  },
];

const IS_DEV = import.meta.env.DEV;

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(null);

  const { data, isLoading } = useQuery(["plan"], () => apiFetch("/api/plan"));

  const devActivateMutation = useMutation(
    (plan) =>
      apiFetch("/api/billing/dev/activate", {
        method: "POST",
        body: JSON.stringify({ plan }),
      }),
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries(["plan"]);
        setMessage({ status: "success", text: `Plan set to ${result.plan}.` });
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

        {IS_DEV && (
          <Layout.Section>
            <Banner status="info">
              Development mode: use the buttons below to switch plans and test
              Pro/Premium features. Paid billing is not available for custom
              apps until the app is published.
            </Banner>
          </Layout.Section>
        )}

        {isLoading ? (
          <Layout.Section>
            <Card sectioned>
              <SkeletonBodyText lines={4} />
            </Card>
          </Layout.Section>
        ) : (
          data && (
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
                </Stack>
              </Card>
            </Layout.Section>
          )
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
                    ) : IS_DEV ? (
                      <Button
                        primary={plan.key !== "free"}
                        loading={devActivateMutation.isLoading}
                        onClick={() => devActivateMutation.mutate(plan.key)}
                      >
                        Switch to {plan.name}
                      </Button>
                    ) : null}
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
