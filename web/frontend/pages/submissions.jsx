import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Button,
  Stack,
  EmptyState,
  Select,
  SkeletonBodyText,
  Box,
  Badge,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "../utils/api";
import SubmissionDetailModal, {
  submissionPreview,
} from "../components/SubmissionDetailModal";
import FilePreviewModal from "../components/FilePreviewModal";

export default function AllSubmissionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [formFilter, setFormFilter] = useState("");
  const [daysFilter, setDaysFilter] = useState("0");
  const [selected, setSelected] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const queryKey = ["all-submissions", page, formFilter, daysFilter];
  const { data, isLoading } = useQuery(queryKey, () => {
    const params = new URLSearchParams({ page, limit: "20" });
    if (formFilter) params.set("formId", formFilter);
    if (daysFilter !== "0") params.set("days", daysFilter);
    return apiFetch(`/api/submissions?${params}`);
  });

  const submissions = data?.submissions || [];
  const forms = data?.forms || [];
  const total = data?.pagination?.total || 0;

  async function downloadFile(fileId) {
    const result = await apiFetch(`/api/submissions/files/${fileId}/download`);
    window.open(result.url, "_blank");
  }

  const rowMarkup = submissions.map((sub, index) => (
    <IndexTable.Row id={sub.id} key={sub.id} position={index}>
      <IndexTable.Cell>
        <Stack vertical spacing="extraTight">
          <Text variant="bodyMd">
            {new Date(sub.createdAt).toLocaleDateString()}
          </Text>
          <Text variant="bodySm" color="subdued">
            {new Date(sub.createdAt).toLocaleTimeString()}
          </Text>
        </Stack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button plain onClick={() => navigate(`/forms/${sub.formId}`)}>
          {sub.formName}
        </Button>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Stack vertical spacing="extraTight">
          <Text variant="bodySm">
            {submissionPreview(sub.formSchema, sub.payload, sub.files)}
          </Text>
          {sub.files?.length > 0 && (
            <Badge size="small">📎 {sub.files.length} file{sub.files.length === 1 ? "" : "s"}</Badge>
          )}
        </Stack>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Button onClick={() => setSelected(sub)}>View</Button>
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      title="Submissions"
      subtitle={total ? `${total} total` : undefined}
    >
      <TitleBar title="Submissions" />

      <Layout>
        <Layout.Section>
          <Card sectioned>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
              }}
            >
              <Select
                label="Form"
                options={[
                  { label: "All forms", value: "" },
                  ...forms.map((f) => ({ label: f.name, value: f.id })),
                ]}
                value={formFilter}
                onChange={(v) => {
                  setFormFilter(v);
                  setPage(1);
                }}
              />
              <Select
                label="Date range"
                options={[
                  { label: "All time", value: "0" },
                  { label: "Last 7 days", value: "7" },
                  { label: "Last 30 days", value: "30" },
                ]}
                value={daysFilter}
                onChange={(v) => {
                  setDaysFilter(v);
                  setPage(1);
                }}
              />
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            {isLoading ? (
              <Box padding="400">
                <SkeletonBodyText lines={8} />
              </Box>
            ) : submissions.length === 0 ? (
              <EmptyState heading="No submissions yet">
                <p>Submissions from your storefront forms will appear here.</p>
              </EmptyState>
            ) : (
              <>
                <Box padding="300" paddingBlockEnd="0">
                  <Stack spacing="tight">
                    <Badge>
                      {total} submission{total === 1 ? "" : "s"}
                    </Badge>
                  </Stack>
                </Box>
                <IndexTable
                  resourceName={{
                    singular: "submission",
                    plural: "submissions",
                  }}
                  itemCount={submissions.length}
                  headings={[
                    { title: "Date" },
                    { title: "Form" },
                    { title: "Preview" },
                    { title: "" },
                  ]}
                >
                  {rowMarkup}
                </IndexTable>
              </>
            )}
          </Card>

          {total > 20 && (
            <Box paddingBlockStart="400">
              <Stack distribution="center" spacing="tight">
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
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
            </Box>
          )}
        </Layout.Section>
      </Layout>

      <SubmissionDetailModal
        open={Boolean(selected)}
        submission={selected}
        schema={selected?.formSchema}
        formName={selected?.formName}
        onClose={() => setSelected(null)}
        onDownloadFile={downloadFile}
        onViewFile={(fileId, fileName, mimeType) =>
          setPreviewFile({ fileId, fileName, mimeType })
        }
      />

      <FilePreviewModal
        open={Boolean(previewFile)}
        fileId={previewFile?.fileId}
        fileName={previewFile?.fileName}
        mimeType={previewFile?.mimeType}
        onClose={() => setPreviewFile(null)}
      />
    </Page>
  );
}
