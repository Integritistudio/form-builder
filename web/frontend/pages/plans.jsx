import { useState } from "react";
import {
  Page,
  Layout,
  Banner,
  TextField,
  Button,
  FormLayout,
} from "@shopify/polaris";
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
      "500 submissions/month",
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
      "Unlimited submissions",
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

const IS_LOCAL_DEV = import.meta.env.DEV;
const PLAN_RANK = { free: 0, pro: 1, premium: 2 };

function formatLimit(value) {
  return value === Infinity || value == null ? "unlimited" : String(value);
}

function billingStatusUrl() {
  const params = new URLSearchParams(window.location.search);
  const planHandle = params.get("plan_handle");
  if (!planHandle) return "/api/billing/status";
  const query = new URLSearchParams({ plan_handle: planHandle });
  return `/api/billing/status?${query.toString()}`;
}

function getBillingContext() {
  const params = new URLSearchParams(window.location.search);
  const host = params.get("host");
  return host ? { host } : {};
}

function applyBillingRedirect(result) {
  const redirectUrl =
    result.exitUrl ||
    result.pricingUrl ||
    result.shopifyUrl ||
    result.legacyManagedUrl ||
    result.shopPricingUrl;

  if (redirectUrl) {
    window.open(redirectUrl, "_top");
    return true;
  }
  return false;
}

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [affiliateInput, setAffiliateInput] = useState("");
  const [affiliateMessage, setAffiliateMessage] = useState(null);

  useQuery(["billing-status"], () => apiFetch(billingStatusUrl()), {
    retry: false,
    onSuccess: (result) => {
      queryClient.invalidateQueries(["plan"]);
      const params = new URLSearchParams(window.location.search);
      const returnedFromCharge =
        params.has("plan_handle") || params.has("charge_id");
      if (returnedFromCharge && result.plan) {
        setMessage({
          status: "success",
          text: `Subscription approved. You are now on the ${result.plan} plan.`,
        });
        params.delete("plan_handle");
        params.delete("charge_id");
        const nextSearch = params.toString();
        const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
        window.history.replaceState({}, "", nextUrl);
      }
    },
    onError: () => {
      // Billing sync can fail on dev stores with managed pricing; plan API still works.
    },
  });

  const { data, isLoading } = useQuery(["plan"], () => apiFetch("/api/plan"));

  const affiliateMutation = useMutation(
    (affiliateCode) =>
      apiFetch("/api/plan/affiliate", {
        method: "POST",
        body: JSON.stringify({ affiliate_code: affiliateCode }),
      }),
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries(["plan"]);
        setAffiliateInput("");
        setAffiliateMessage({
          status: "success",
          text: result.duplicateAttribution
            ? "Affiliate code already linked to this store."
            : "Affiliate code saved successfully.",
        });
      },
      onError: (err) => {
        setAffiliateMessage({
          status: "critical",
          text: err.message || "Invalid affiliate code.",
        });
      },
    }
  );

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
        body: JSON.stringify({ plan: billingPlan, ...getBillingContext() }),
      }),
    {
      onSuccess: (result) => {
        if (applyBillingRedirect(result)) return;
        queryClient.invalidateQueries(["plan"]);
        setMessage({
          status: "success",
          text: result.alreadyActive
            ? `You are already on the ${result.plan} plan.`
            : "Plan updated successfully.",
        });
        setPendingPlan(null);
      },
      onError: (err) => {
        setMessage({ status: "critical", text: err.message });
        setPendingPlan(null);
      },
    }
  );

  const downgradeMutation = useMutation(
    (planKey) =>
      apiFetch("/api/billing/downgrade", {
        method: "POST",
        body: JSON.stringify({ plan: planKey, ...getBillingContext() }),
      }),
    {
      onSuccess: (result) => {
        if (applyBillingRedirect(result)) return;
        queryClient.invalidateQueries(["plan"]);
        queryClient.invalidateQueries(["billing-status"]);
        setMessage({
          status: "success",
          text: result.alreadyActive
            ? `You are already on the ${result.plan} plan.`
            : `Downgraded to the ${result.plan} plan.`,
        });
        setPendingPlan(null);
      },
      onError: (err) => {
        setMessage({ status: "critical", text: err.message });
        setPendingPlan(null);
      },
    }
  );

  const currentPlan = data?.plan || "free";
  const savedAffiliateCode = data?.affiliateCode || null;
  const isBillingBusy =
    subscribeMutation.isLoading || downgradeMutation.isLoading;

  function handleUpgrade(billingPlan) {
    setPendingPlan(billingPlan);
    subscribeMutation.mutate(billingPlan);
  }

  function handleDowngrade(planKey) {
    const planName =
      PLAN_DETAILS.find((p) => p.key === planKey)?.name || planKey;
    const confirmed = window.confirm(
      planKey === "free"
        ? "Downgrade to Free? Paid features will stop and active forms may exceed Free limits."
        : `Downgrade to ${planName}? Some higher-tier features may become unavailable.`
    );
    if (!confirmed) return;
    setPendingPlan(planKey);
    downgradeMutation.mutate(planKey);
  }

  function handleAffiliateSubmit() {
    setAffiliateMessage(null);
    affiliateMutation.mutate(affiliateInput.trim());
  }

  function renderPlanAction(plan) {
    const isCurrent = currentPlan === plan.key;

    if (isCurrent) {
      return (
        <span className="app-status app-status--active">Current plan</span>
      );
    }

    if (IS_LOCAL_DEV) {
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

    if (PLAN_RANK[plan.key] > PLAN_RANK[currentPlan] && plan.billingPlan) {
      return (
        <button
          type="button"
          className="app-btn-primary"
          disabled={isBillingBusy}
          onClick={() => handleUpgrade(plan.billingPlan)}
        >
          {subscribeMutation.isLoading && pendingPlan === plan.billingPlan
            ? "Redirecting…"
            : `Upgrade to ${plan.name}`}
        </button>
      );
    }

    if (PLAN_RANK[plan.key] < PLAN_RANK[currentPlan]) {
      return (
        <button
          type="button"
          className="app-btn-outline"
          disabled={isBillingBusy}
          onClick={() => handleDowngrade(plan.key)}
        >
          {downgradeMutation.isLoading && pendingPlan === plan.key
            ? "Updating…"
            : `Downgrade to ${plan.name}`}
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

          {IS_LOCAL_DEV && (
            <Layout.Section>
              <Banner status="info">
                Local development: use the buttons below to switch plans without
                Shopify billing.
              </Banner>
            </Layout.Section>
          )}

          {!IS_LOCAL_DEV && (
            <Layout.Section>
              <Banner status="info">
                Plan changes are managed through Shopify. You&apos;ll be
                redirected to Shopify&apos;s pricing page to confirm your
                selection.
              </Banner>
            </Layout.Section>
          )}

          {!isLoading && (
            <Layout.Section>
              <div className="app-panel app-section-gap">
                <div className="app-panel-body">
                  <h3 className="app-plan-name" style={{ marginBottom: 8 }}>
                    Affiliate code
                  </h3>
                  <p className="app-subdued" style={{ marginBottom: 16 }}>
                    Enter a partner affiliate code once. It is verified before
                    being saved and cannot be changed afterward.
                  </p>

                  {affiliateMessage && (
                    <div style={{ marginBottom: 16 }}>
                      <Banner
                        status={affiliateMessage.status}
                        onDismiss={() => setAffiliateMessage(null)}
                      >
                        {affiliateMessage.text}
                      </Banner>
                    </div>
                  )}

                  {savedAffiliateCode ? (
                    <div className="app-flex-center" style={{ gap: 12, flexWrap: "wrap" }}>
                      <span className="app-subdued">Saved code</span>
                      <span className="app-status app-status--active">
                        {savedAffiliateCode}
                      </span>
                    </div>
                  ) : (
                    <FormLayout>
                      <TextField
                        label="Affiliate code"
                        value={affiliateInput}
                        onChange={setAffiliateInput}
                        autoComplete="off"
                        placeholder="AFF-ABC123"
                        disabled={affiliateMutation.isLoading}
                      />
                      <Button
                        primary
                        loading={affiliateMutation.isLoading}
                        disabled={!affiliateInput.trim()}
                        onClick={handleAffiliateSubmit}
                      >
                        Save affiliate code
                      </Button>
                    </FormLayout>
                  )}
                </div>
              </div>
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
                      <span className="app-subdued">
                        {data.usage.monthlySubmissions} submissions this month
                        {data.usage.monthlySubmissionLimit !== Infinity &&
                          ` of ${formatLimit(data.usage.monthlySubmissionLimit)}`}
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
