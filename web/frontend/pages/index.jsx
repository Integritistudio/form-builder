import { useState, useMemo } from "react";
import {
  Page,
  Layout,
  Banner,
  Modal,
  Text,
  Button,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "../utils/api";
import { AppShell } from "../components/layout";
import {
  IconDocument,
  IconCalendar,
  IconForms,
  IconStar,
  IconSearch,
  IconCopy,
  IconCheck,
  IconDelete,
  IconSparkle,
  IconPalette,
} from "../components/dashboard/DashboardIcons";

function CopyIdButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      className={`app-icon-btn${copied ? " app-icon-btn--success" : ""}`}
      onClick={copy}
      title="Copy ID"
      aria-label="Copy form ID"
    >
      {copied ? <IconCheck /> : <IconCopy />}
    </button>
  );
}

function Sparkline({ dailyCounts }) {
  const max = Math.max(...(dailyCounts || []).map((d) => d.count), 1);
  const counts = dailyCounts || [];

  return (
    <div className="app-sparkline" aria-hidden>
      {counts.map((d, i) => {
        const pct = Math.max(8, (d.count / max) * 100);
        const isLast = i === counts.length - 1;
        return (
          <div
            key={d.date}
            className={`app-sparkline-bar${isLast ? " app-sparkline-bar--active" : ""}`}
            style={{ height: `${pct}%` }}
            title={`${d.date}: ${d.count}`}
          />
        );
      })}
    </div>
  );
}

function StatsGrid({ analytics, loading }) {
  if (loading) {
    return (
      <div className="app-stats">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="app-skeleton-stat" />
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="app-stats">
      <div className="app-stat-card">
        <div className="app-stat-header">
          <span className="app-stat-label">Total submissions</span>
          <span className="app-stat-icon">
            <IconDocument />
          </span>
        </div>
        <div className="app-stat-value">{analytics.totalSubmissions}</div>
        <div className="app-stat-footer app-stat-footer-muted">
          Across all forms
        </div>
      </div>

      <div className="app-stat-card">
        <div className="app-stat-header">
          <span className="app-stat-label">Submissions this week</span>
          <span className="app-stat-icon">
            <IconCalendar />
          </span>
        </div>
        <div className="app-sparkline-wrap">
          <div className="app-stat-value">{analytics.weekSubmissions}</div>
          <Sparkline dailyCounts={analytics.dailyCounts} />
        </div>
      </div>

      <div className="app-stat-card">
        <div className="app-stat-header">
          <span className="app-stat-label">Active forms</span>
          <span className="app-stat-icon">
            <IconForms />
          </span>
        </div>
        <div className="app-stat-value">{analytics.activeForms}</div>
        <div className="app-stat-footer app-stat-footer-muted">
          Healthy form status
        </div>
      </div>

      <div className="app-stat-card">
        <div className="app-stat-header">
          <span className="app-stat-label">Top form</span>
          <span className="app-stat-icon">
            <IconStar />
          </span>
        </div>
        <div className="app-stat-value app-stat-value-sm">
          {analytics.topForm?.formName || "—"}
        </div>
        {analytics.topForm && (
          <div className="app-stat-footer app-stat-footer-muted">
            {analytics.topForm.count} submissions
          </div>
        )}
      </div>
    </div>
  );
}

function FormsTable({
  forms,
  loading,
  search,
  onSearchChange,
  onEdit,
  onSubmissions,
  onDelete,
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return forms;
    return forms.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q) ||
        f.status.toLowerCase().includes(q)
    );
  }, [forms, search]);

  if (loading) {
    return (
      <div className="app-panel">
        <div className="app-panel-header">
          <h2 className="app-panel-title">All Forms</h2>
        </div>
        <div className="app-empty">
          <Text color="subdued">Loading forms…</Text>
        </div>
      </div>
    );
  }

  if (forms.length === 0) {
    return null;
  }

  return (
    <div className="app-panel">
      <div className="app-panel-header">
        <h2 className="app-panel-title">All Forms</h2>
        <div className="app-panel-toolbar">
          <div className="app-search">
            <span className="app-search-icon">
              <IconSearch />
            </span>
            <input
              type="search"
              placeholder="Search forms..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Search forms"
            />
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="app-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Form ID</th>
              <th className="app-text-center">Submissions</th>
              <th>Created</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32 }}>
                  <Text color="subdued">No forms match your search.</Text>
                </td>
              </tr>
            ) : (
              filtered.map((form) => (
                <tr key={form.id}>
                  <td>
                    <button
                      type="button"
                      className="app-form-link"
                      onClick={() => onEdit(form.id)}
                    >
                      {form.name}
                    </button>
                  </td>
                  <td>
                    <span
                      className={`app-status app-status--${
                        form.status === "active" ? "active" : "draft"
                      }`}
                    >
                      {form.status}
                    </span>
                  </td>
                  <td>
                    <div className="app-id-cell">
                      <code>{form.id.slice(0, 8)}…</code>
                      <CopyIdButton text={form.id} />
                    </div>
                  </td>
                  <td className="app-text-center">
                    {form.submissionCount ?? 0}
                  </td>
                  <td style={{ color: "var(--app-on-surface-variant)" }}>
                    {form.createdAt
                      ? new Date(form.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <div className="app-actions">
                      <button
                        type="button"
                        className="app-btn-outline"
                        onClick={() => onSubmissions(form.id)}
                      >
                        Submissions
                      </button>
                      <button
                        type="button"
                        className="app-icon-btn app-icon-btn--danger"
                        onClick={() => onDelete(form.id)}
                        title="Delete form"
                        aria-label="Delete form"
                      >
                        <IconDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="app-panel-footer">
        <span>
          Showing {filtered.length} of {forms.length} form
          {forms.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

function ThemeGuide({ onPlans }) {
  return (
    <div className="app-bottom-grid">
      <div className="app-guide">
        <div className="app-guide-header">
          <div className="app-guide-icon">
            <IconSparkle />
          </div>
          <h3 className="app-panel-title">Add form to your theme</h3>
        </div>
        <div className="app-guide-steps">
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li className="app-step" style={{ marginBottom: 16 }}>
              <span className="app-step-num">1</span>
              <p>
                Open <strong>Online Store</strong> → Themes → Customize
              </p>
            </li>
            <li className="app-step">
              <span className="app-step-num">2</span>
              <p>
                Add a section or block and choose{" "}
                <strong>Integriti Form</strong>
              </p>
            </li>
          </ol>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            <li className="app-step" style={{ marginBottom: 16 }}>
              <span className="app-step-num">3</span>
              <p>
                Paste your <strong>Form ID</strong> into the block setting
              </p>
            </li>
            <li className="app-step">
              <span className="app-step-num">4</span>
              <p>Save the theme to go live</p>
            </li>
          </ol>
        </div>
      </div>

      <div className="app-promo">
        <div>
          <h4>Need custom styling?</h4>
          <p>
            Upgrade to Pro for custom CSS, gradients, multi-step forms, file uploads, and advanced
            form styling on your storefront.
          </p>
        </div>
        <button type="button" className="app-promo-btn" onClick={onPlans}>
          View plans
        </button>
        <div className="app-promo-deco" aria-hidden>
          <IconPalette />
        </div>
      </div>
    </div>
  );
}

export default function FormsIndexPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");

  const { data: formsData, isLoading } = useQuery(["forms"], () =>
    apiFetch("/api/forms")
  );

  const { data: planData } = useQuery(["plan"], () => apiFetch("/api/plan"));

  const { data: analytics, isLoading: analyticsLoading } = useQuery(
    ["analytics"],
    () => apiFetch("/api/submissions/analytics")
  );

  const createMutation = useMutation(
    () => apiFetch("/api/forms", { method: "POST", body: JSON.stringify({}) }),
    {
      onSuccess: (data) => navigate(`/forms/${data.form.id}`),
      onError: (err) => alert(err.message),
    }
  );

  const deleteMutation = useMutation(
    (id) => apiFetch(`/api/forms/${id}`, { method: "DELETE" }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["forms"]);
        queryClient.invalidateQueries(["analytics"]);
        setDeleteId(null);
      },
    }
  );

  const forms = formsData?.forms || [];

  const atLimit =
    planData?.plan === "free" &&
    planData?.usage?.totalForms >= planData?.usage?.formLimit;

  const lastUpdated = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <AppShell>
      <Page fullWidth>
        <TitleBar title="Integriti Forms">
          <button
            variant="primary"
            disabled={atLimit || createMutation.isLoading}
            onClick={() => createMutation.mutate()}
          >
            Create form
          </button>
        </TitleBar>

        <Layout>
          {planData && !planData.smtpConfigured && (
            <Layout.Section>
              <Banner
                status="warning"
                action={{
                  content: "Email settings",
                  onAction: () => navigate("/settings"),
                }}
              >
                SMTP is not configured. Submissions will be saved but emails
                will not be sent.
              </Banner>
            </Layout.Section>
          )}

          {atLimit && (
            <Layout.Section>
              <Banner
                status="info"
                action={{
                  content: "View plans",
                  onAction: () => navigate("/plans"),
                }}
              >
                You have reached the free plan limit of 3 forms. Upgrade for
                unlimited forms.
              </Banner>
            </Layout.Section>
          )}

          <Layout.Section>
            <div className="app-hero">
              <div>
                <h1>Form Overview</h1>
                <p>
                  Manage your interactive forms and track submissions in
                  real-time.
                </p>
              </div>
              <div className="app-hero-meta">
                Last updated: {lastUpdated}
              </div>
            </div>

            <StatsGrid analytics={analytics} loading={analyticsLoading} />

            {forms.length === 0 && !isLoading ? (
              <div className="app-panel">
                <div className="app-empty">
                  <EmptyState
                    heading="Create your first form"
                    action={{
                      content: "Create form",
                      onAction: () => createMutation.mutate(),
                    }}
                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  >
                    <p>
                      Build a custom form and add it to your storefront with a
                      Form ID.
                    </p>
                  </EmptyState>
                </div>
              </div>
            ) : (
              <FormsTable
                forms={forms}
                loading={isLoading}
                search={search}
                onSearchChange={setSearch}
                onEdit={(id) => navigate(`/forms/${id}`)}
                onSubmissions={(id) => navigate(`/forms/${id}/submissions`)}
                onDelete={setDeleteId}
              />
            )}

            <ThemeGuide onPlans={() => navigate("/plans")} />
          </Layout.Section>
        </Layout>

        <Modal
          open={Boolean(deleteId)}
          onClose={() => setDeleteId(null)}
          title="Delete form"
          primaryAction={{
            content: "Delete",
            destructive: true,
            onAction: () => deleteMutation.mutate(deleteId),
          }}
          secondaryActions={[
            { content: "Cancel", onAction: () => setDeleteId(null) },
          ]}
        >
          <Modal.Section>
            <Text>
              This will permanently delete the form and all its submissions.
            </Text>
          </Modal.Section>
        </Modal>
      </Page>
    </AppShell>
  );
}
