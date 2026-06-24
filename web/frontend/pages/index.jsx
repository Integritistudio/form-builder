import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  EmptyState,
  Banner,
  Stack,
  Modal,
  useIndexResourceState,
  SkeletonBodyText,
  SkeletonDisplayText,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "../utils/api";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Button size="slim" onClick={copy}>
      {copied ? "Copied" : "Copy ID"}
    </Button>
  );
}

function AnalyticsCards({ analytics, loading }) {
  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} sectioned>
            <SkeletonDisplayText size="small" />
            <Box paddingBlockStart="200">
              <SkeletonBodyText lines={1} />
            </Box>
          </Card>
        ))}
      </div>
    );
  }

  if (!analytics) return null;

  const maxDaily = Math.max(...(analytics.dailyCounts || []).map((d) => d.count), 1);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "16px",
      }}
    >
      <Card sectioned>
        <Stack vertical spacing="extraTight">
          <Text variant="bodySm" color="subdued">
            Total submissions
          </Text>
          <Text variant="headingLg" as="p">
            {analytics.totalSubmissions}
          </Text>
        </Stack>
      </Card>
      <Card sectioned>
        <Stack vertical spacing="extraTight">
          <Text variant="bodySm" color="subdued">
            This week
          </Text>
          <Text variant="headingLg" as="p">
            {analytics.weekSubmissions}
          </Text>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 32 }}>
            {(analytics.dailyCounts || []).map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count}`}
                style={{
                  flex: 1,
                  height: `${Math.max(4, (d.count / maxDaily) * 100)}%`,
                  background: "#2c6ecb",
                  borderRadius: 2,
                  minHeight: 4,
                }}
              />
            ))}
          </div>
        </Stack>
      </Card>
      <Card sectioned>
        <Stack vertical spacing="extraTight">
          <Text variant="bodySm" color="subdued">
            Active forms
          </Text>
          <Text variant="headingLg" as="p">
            {analytics.activeForms}
          </Text>
        </Stack>
      </Card>
      <Card sectioned>
        <Stack vertical spacing="extraTight">
          <Text variant="bodySm" color="subdued">
            Top form
          </Text>
          <Text variant="headingMd" as="p">
            {analytics.topForm?.formName || "—"}
          </Text>
          {analytics.topForm && (
            <Text variant="bodySm" color="subdued">
              {analytics.topForm.count} submissions
            </Text>
          )}
        </Stack>
      </Card>
    </div>
  );
}

export default function FormsIndexPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);

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
  const resourceName = { singular: "form", plural: "forms" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(forms);

  const rowMarkup = forms.map((form, index) => (
    <IndexTable.Row
      id={form.id}
      key={form.id}
      position={index}
      selected={selectedResources.includes(form.id)}
    >
      <IndexTable.Cell>
        <Button plain onClick={() => navigate(`/forms/${form.id}`)}>
          {form.name}
        </Button>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge status={form.status === "active" ? "success" : "info"}>
          {form.status}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Stack spacing="tight">
          <Text as="span" variant="bodySm">
            <code>{form.id.slice(0, 8)}...</code>
          </Text>
          <CopyButton text={form.id} />
        </Stack>
      </IndexTable.Cell>
      <IndexTable.Cell>{form.submissionCount ?? 0}</IndexTable.Cell>
      <IndexTable.Cell>
        {form.createdAt
          ? new Date(form.createdAt).toLocaleDateString()
          : "—"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Stack spacing="tight">
          <Button
            size="slim"
            onClick={() => navigate(`/forms/${form.id}/submissions`)}
          >
            Submissions
          </Button>
          <Button size="slim" destructive onClick={() => setDeleteId(form.id)}>
            Delete
          </Button>
        </Stack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  const atLimit =
    planData?.plan === "free" &&
    planData?.usage?.totalForms >= planData?.usage?.formLimit;

  return (
    <Page>
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
              action={{ content: "Email settings", onAction: () => navigate("/settings") }}
            >
              SMTP is not configured. Submissions will be saved but emails will not be sent.
            </Banner>
          </Layout.Section>
        )}

        {atLimit && (
          <Layout.Section>
            <Banner
              status="info"
              action={{ content: "View plans", onAction: () => navigate("/plans") }}
            >
              You have reached the free plan limit of 3 forms. Upgrade for unlimited forms.
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <AnalyticsCards analytics={analytics} loading={analyticsLoading} />
        </Layout.Section>

        <Layout.Section>
          <Card>
            {forms.length === 0 && !isLoading ? (
              <EmptyState
                heading="Create your first form"
                action={{
                  content: "Create form",
                  onAction: () => createMutation.mutate(),
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Build a custom form and add it to your storefront with a Form ID.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={resourceName}
                itemCount={forms.length}
                selectedItemsCount={selectedResources.length}
                onSelectionChange={handleSelectionChange}
                headings={[
                  { title: "Name" },
                  { title: "Status" },
                  { title: "Form ID" },
                  { title: "Submissions" },
                  { title: "Created" },
                  { title: "Actions" },
                ]}
                loading={isLoading}
              >
                {rowMarkup}
              </IndexTable>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card title="Add form to your theme" sectioned>
            <Stack vertical spacing="tight">
              <Text>1. Open Online Store → Themes → Customize</Text>
              <Text>2. Add a section or block and choose Integriti Form</Text>
              <Text>3. Paste your Form ID into the block setting</Text>
              <Text>4. Save the theme</Text>
            </Stack>
          </Card>
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
        secondaryActions={[{ content: "Cancel", onAction: () => setDeleteId(null) }]}
      >
        <Modal.Section>
          <Text>This will permanently delete the form and all its submissions.</Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
