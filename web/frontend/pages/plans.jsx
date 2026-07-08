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
    billingPlan: null,
    features: [
      "Up to 5 forms (1 active)",
      "Unlimited submissions",
      "Email notifications",
      "Theme embed",
      "Basic form styling",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$9.99/mo",
    billingPlan: "pro",
    features: [
      "Up to 10 forms (5 active)",
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
    price: "$14.99/mo",
    billingPlan: "premium",
    features: [
      "Unlimited forms",
      "Everything in Pro",
      "PDF & Word document uploads",
      "Images + documents (no zip files)",
      "Priority support",
    ],
  },
];

const IS_DEV = import.meta.env.DEV;

const PLAN_RANK = { free: 0, pro: 1, premium: 2 };

function formatLimit(value) {
  return value === Infinity || value == null ? "unlimited" : String(value);
}

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(null);
  const [upgradingPlan, setUpgradingPlan] = useState(null);

  useQuery(["billing-status"], () => apiFetch("/api/billing/status"), {
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries(["plan"]);
    },
    onError: () => {
      // Billing sync can fail on dev stores with managed pricing; plan API still works.
    },
  });

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

  const subscribeMutation = useMutation(
    (billingPlan) =>
      apiFetch("/api/billing/subscribe", {
        method: "POST",
        body: JSON.stringify({ plan: billingPlan }),
      }),
    {
      onSuccess: (result) => {
        if (result.confirmationUrl) {
          window.open(result.confirmationUrl, "_top");
          return;
        }
        queryClient.invalidateQueries(["plan"]);
        setMessage({
          status: "success",
          text: result.alreadyActive
            ? `You are already on the ${result.plan} plan.`
            : "Plan updated successfully.",
        });
        setUpgradingPlan(null);
      },
      onError: (err) => {
        setMessage({ status: "critical", text: err.message });
        setUpgradingPlan(null);
      },
    }
  );

  const currentPlan = data?.plan || "free";

  function handleUpgrade(billingPlan) {
    setUpgradingPlan(billingPlan);
    subscribeMutation.mutate(billingPlan);
  }

  function renderPlanAction(plan) {
    const isCurrent = currentPlan === plan.key;

    if (isCurrent) {
      return (
        <span className="app-status app-status--active">Current plan</span>
      );
    }

    if (IS_DEV) {
      return (
        <button
          type="button"
          className={plan.key !== "free" ? "app-btn-primary" : "app-btn-outline"}
          disabled={devActivateMutation.isLoading}
          onClick={() => devActivateMutation.mutate(plan.key)}
        >
          Switch to {plan.name}
        </button>
      );
    }

    if (
      plan.billingPlan &&
      PLAN_RANK[plan.key] > PLAN_RANK[currentPlan]
    ) {
      return (
        <button
          type="button"
          className="app-btn-primary"
          disabled={subscribeMutation.isLoading}
          onClick={() => handleUpgrade(plan.billingPlan)}
        >
          {subscribeMutation.isLoading && upgradingPlan === plan.billingPlan
            ? "Redirecting…"
            : `Upgrade to ${plan.name}`}
        </button>
      );
    }

    return null;
  }

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
                    <div className="app-flex-center" style={{ gap: 16, flexWrap: "wrap" }}>
                      <span className="app-subdued">Current plan</span>
                      <span
                        className={`app-status app-status--${currentPlan === "free" ? "draft" : "active"}`}
                      >
                        {currentPlan}
                      </span>
                      <span className="app-subdued">
                        {data.usage.activeForms} active
                        {data.usage.activeFormLimit !== Infinity &&
                          ` of ${formatLimit(data.usage.activeFormLimit)}`}
                      </span>
                      <span className="app-subdued">
                        {data.usage.totalForms} total
                        {data.usage.totalFormLimit !== Infinity &&
                          ` of ${formatLimit(data.usage.totalFormLimit)}`}
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
                    {renderPlanAction(plan)}
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
