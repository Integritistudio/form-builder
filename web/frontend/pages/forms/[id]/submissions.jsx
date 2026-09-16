import { useState } from "react";
import { Page, Layout, Banner, Button, Modal, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useParams, useNavigate } from "react-router-dom";

import { apiFetch, apiDownload } from "../../../utils/api";
import { AppShell, PageHero, AppPagination } from "../../../components/layout";
import SubmissionsTable from "../../../components/submissions/SubmissionsTable";
import SubmissionDetailModal from "../../../components/SubmissionDetailModal";
import { IconDownload } from "../../../components/dashboard/DashboardIcons";

export default function SubmissionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  const { data, isLoading } = useQuery(["submissions", id, page], () =>
    apiFetch(`/api/forms/${id}/submissions?page=${page}&limit=20`)
  );

  const deleteMutation = useMutation(
    (subId) => apiFetch(`/api/submissions/${subId}`, { method: "DELETE" }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["submissions", id, page]);
        queryClient.invalidateQueries(["all-submissions"]);
        queryClient.invalidateQueries(["analytics"]);
        setDeleteId(null);
      },
      onError: (err) => setModalMessage({ title: "Delete Failed", message: err.message || "Failed to delete submission" }),
    }
  );

  const submissions = data?.submissions || [];
  const form = data?.form;
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / 20) || 1;

  async function handleExport() {
    if (total === 0 || submissions.length === 0) {
      setModalMessage({ title: "Export Failed", message: "No submissions to export on this form yet." });
      return;
    }

    try {
      setExporting(true);
      const safeFormName = (form?.name || "form").replace(/[^a-zA-Z0-9_-]/g, "_");
      await apiDownload(
        `/api/submissions/export?formId=${id}`,
        `${safeFormName}-submissions-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (err) {
      setModalMessage({ title: "Export Failed", message: err.message || "No submissions found to export." });
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      <Page
        backAction={{ onAction: () => navigate(`/forms/${id}`) }}
      >
        <TitleBar title="Submissions">
          <button
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </TitleBar>

        <Layout>
          <Layout.Section>
            <PageHero
              title={form ? `Submissions — ${form.name}` : "Submissions"}
              subtitle={
                total
                  ? `${total} submission${total === 1 ? "" : "s"} on this form`
                  : "Responses from this form will appear here."
              }
              meta={
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {total > 0 ? (
                    <span className="app-badge-inline">
                      {total} total
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="app-btn-outline"
                    onClick={handleExport}
                    disabled={exporting}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <IconDownload />
                    <span>{exporting ? "Exporting…" : "Export CSV"}</span>
                  </button>
                </div>
              }
            />
          </Layout.Section>

          <Layout.Section>
            <Banner
              action={{ content: "All submissions", onAction: () => navigate("/submissions") }}
            >
              View submissions across all forms in one place.
            </Banner>
          </Layout.Section>

          <Layout.Section>
            <SubmissionsTable
              submissions={submissions}
              loading={isLoading}
              schema={form?.schema}
              onView={setSelected}
              onDelete={setDeleteId}
              emptyText="Submissions will appear here when customers fill out your form."
            />

            <AppPagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </Layout.Section>
        </Layout>

        <SubmissionDetailModal
          open={Boolean(selected)}
          submission={selected}
          schema={form?.schema}
          formName={form?.name}
          onClose={() => setSelected(null)}
        />

        <Modal
          open={Boolean(deleteId)}
          onClose={() => setDeleteId(null)}
          title="Delete submission"
          primaryAction={{
            content: "Delete",
            destructive: true,
            loading: deleteMutation.isLoading,
            onAction: () => deleteMutation.mutate(deleteId),
          }}
          secondaryActions={[
            { content: "Cancel", onAction: () => setDeleteId(null) },
          ]}
        >
          <Modal.Section>
            <Text>
              Are you sure you want to delete this submission? This action cannot be undone.
            </Text>
          </Modal.Section>
        </Modal>

        <Modal
          open={Boolean(modalMessage)}
          onClose={() => setModalMessage(null)}
          title={modalMessage?.title || "Notification"}
          primaryAction={{
            content: "Close",
            onAction: () => setModalMessage(null),
          }}
        >
          <Modal.Section>
            <Text>{modalMessage?.message}</Text>
          </Modal.Section>
        </Modal>
      </Page>
    </AppShell>
  );
}
