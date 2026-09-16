import { useState } from "react";
import { Page, Layout, Banner, Button, Modal, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";

import { apiFetch, apiDownload } from "../utils/api";
import { AppShell, PageHero, AppPagination } from "../components/layout";
import SubmissionsTable from "../components/submissions/SubmissionsTable";
import SubmissionDetailModal from "../components/SubmissionDetailModal";
import { IconDownload } from "../components/dashboard/DashboardIcons";

export default function AllSubmissionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [formFilter, setFormFilter] = useState("");
  const [daysFilter, setDaysFilter] = useState("0");
  const [selected, setSelected] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  const queryKey = ["all-submissions", page, formFilter, daysFilter];
  const { data, isLoading } = useQuery(queryKey, () => {
    const params = new URLSearchParams({ page, limit: "20" });
    if (formFilter) params.set("formId", formFilter);
    if (daysFilter !== "0") params.set("days", daysFilter);
    return apiFetch(`/api/submissions?${params}`);
  });

  const deleteMutation = useMutation(
    (id) => apiFetch(`/api/submissions/${id}`, { method: "DELETE" }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["all-submissions"]);
        queryClient.invalidateQueries(["submissions"]);
        queryClient.invalidateQueries(["analytics"]);
        setDeleteId(null);
      },
      onError: (err) => setModalMessage({ title: "Delete Failed", message: err.message || "Failed to delete submission" }),
    }
  );

  const submissions = data?.submissions || [];
  const forms = data?.forms || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / 20) || 1;

  async function handleExport() {
    if (total === 0 || submissions.length === 0) {
      setModalMessage({ title: "Export Failed", message: "No submissions to export yet." });
      return;
    }

    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (formFilter) params.set("formId", formFilter);
      if (daysFilter !== "0") params.set("days", daysFilter);
      await apiDownload(
        `/api/submissions/export?${params}`,
        `submissions-export-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (err) {
      setModalMessage({ title: "Export Failed", message: err.message || "No submissions found to export." });
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      <Page fullWidth>
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
              title="Submissions"
              subtitle="View and manage responses from all your storefront forms."
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
            <div className="app-panel app-section-gap">
              <div className="app-panel-body">
                <div className="app-filters" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <div>
                      <label className="app-select-label" htmlFor="form-filter">
                        Form
                      </label>
                      <select
                        id="form-filter"
                        className="app-select"
                        value={formFilter}
                        onChange={(e) => {
                          setFormFilter(e.target.value);
                          setPage(1);
                        }}
                      >
                        <option value="">All forms</option>
                        {forms.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="app-select-label" htmlFor="days-filter">
                        Date range
                      </label>
                      <select
                        id="days-filter"
                        className="app-select"
                        value={daysFilter}
                        onChange={(e) => {
                          setDaysFilter(e.target.value);
                          setPage(1);
                        }}
                      >
                        <option value="0">All time</option>
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <SubmissionsTable
              submissions={submissions}
              loading={isLoading}
              showForm
              onView={setSelected}
              onDelete={setDeleteId}
              onFormClick={(formId) => navigate(`/forms/${formId}`)}
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
          schema={selected?.formSchema}
          formName={selected?.formName}
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
