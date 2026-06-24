import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Button,
  Collapsible,
  Stack,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useQuery } from "react-query";
import { useParams, useNavigate } from "react-router-dom";

import { apiFetch } from "../../../utils/api";

export default function SubmissionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});

  const { data, isLoading } = useQuery(["submissions", id, page], () =>
    apiFetch(`/api/forms/${id}/submissions?page=${page}&limit=20`)
  );

  const submissions = data?.submissions || [];
  const form = data?.form;
  const total = data?.pagination?.total || 0;

  function toggleExpand(subId) {
    setExpanded((prev) => ({ ...prev, [subId]: !prev[subId] }));
  }

  function getFieldLabel(fieldId) {
    const field = form?.schema?.fields?.find((f) => f.id === fieldId);
    return field?.label || fieldId;
  }

  function formatValue(value) {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value ?? "");
  }

  const rowMarkup = submissions.map((sub, index) => (
    <IndexTable.Row id={sub.id} key={sub.id} position={index}>
      <IndexTable.Cell>
        {new Date(sub.createdAt).toLocaleString()}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Stack vertical spacing="tight">
          <Button plain onClick={() => toggleExpand(sub.id)}>
            {expanded[sub.id] ? "Hide details" : "View details"}
          </Button>
          <Collapsible open={expanded[sub.id]} id={`sub-${sub.id}`}>
            <Stack vertical spacing="extraTight">
              {Object.entries(sub.payload || {}).map(([key, value]) => (
                <Text key={key} variant="bodySm">
                  <Text as="span" fontWeight="semibold">
                    {getFieldLabel(key)}:
                  </Text>{" "}
                  {formatValue(value)}
                </Text>
              ))}
            </Stack>
          </Collapsible>
        </Stack>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title={form ? `Submissions — ${form.name}` : "Submissions"}
      backAction={{ onAction: () => navigate(`/forms/${id}`) }}
    >
      <TitleBar title="Submissions" />

      <Layout>
        <Layout.Section>
          <Card>
            {submissions.length === 0 && !isLoading ? (
              <EmptyState heading="No submissions yet">
                <p>Submissions will appear here when customers fill out your form.</p>
              </EmptyState>
            ) : (
              <IndexTable
                resourceName={{ singular: "submission", plural: "submissions" }}
                itemCount={submissions.length}
                headings={[{ title: "Date" }, { title: "Details" }]}
                loading={isLoading}
              >
                {rowMarkup}
              </IndexTable>
            )}
          </Card>

          {total > 20 && (
            <Stack distribution="center" spacing="tight">
              <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Text>
                Page {page} of {Math.ceil(total / 20)}
              </Text>
              <Button
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </Stack>
          )}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
