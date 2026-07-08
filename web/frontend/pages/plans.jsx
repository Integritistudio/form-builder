import { useState } from "react";
import { Page, Layout, Banner } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useMutation, useQuery, useQueryClient } from "react-query";

import { apiFetch } from "../utils/api";
import { AppShell, PageHero } from "../components/layout";

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
      "Multi-step forms",
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
    <AppShell>
      <Page>
        <TitleBar title="Plans" />

        <Layout>
          {message && (
            <Layout.Section>
              <Banner status={message.status} onDismiss={() => setMessage(null)}>
                {message.text}
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <PageHero
              title="Plans & billing"
              subtitle="Choose the right plan for your store. Upgrade for file uploads, custom CSS, and advanced styling."
            />
          </Layout.Section>

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
              <div className="app-skeleton" style={{ height: 120 }} />
            </Layout.Section>
          ) : (
            data && (
              <Layout.Section>
                <div className="app-panel app-section-gap">
                  <div className="app-panel-body">
                    <div className="app-flex-center" style={{ gap: 16 }}>
                      <span className="app-subdued">Current plan</span>
                      <span className={`app-status app-status--${currentPlan === "free" ? "draft" : "active"}`}>
                        {currentPlan}
                      </span>
                      <span className="app-subdued">
                        {data.usage.activeForms} active forms
                        {data.plan === "free" &&
                          ` of ${data.usage.formLimit} allowed`}
                      </span>
                    </div>
                  </div>
                </div>
              </Layout.Section>
            )
          )}

          <Layout.Section>
            <div className="app-plans-grid">
              {PLAN_DETAILS.map((plan) => {
                const isCurrent = currentPlan === plan.key;
                return (
                  <div
                    key={plan.key}
                    className={`app-plan-card${isCurrent ? " app-plan-card--current" : ""}`}
                  >
                    <div>
                      <h3 className="app-plan-name">{plan.name}</h3>
                      <p className="app-plan-price">{plan.price}</p>
                    </div>
                    <ul className="app-plan-features">
                      {plan.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <span className="app-status app-status--active">Current plan</span>
                    ) : IS_DEV ? (
                      <button
                        type="button"
                        className={plan.key !== "free" ? "app-btn-primary" : "app-btn-outline"}
                        disabled={devActivateMutation.isLoading}
                        onClick={() => devActivateMutation.mutate(plan.key)}
                      >
                        Switch to {plan.name}
                      </button>
                    ) : (
                      <p className="app-subdued" style={{ fontSize: 12, margin: 0 }}>
                        Contact support to upgrade.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Layout.Section>
        </Layout>
      </Page>
    </AppShell>
  );
}
