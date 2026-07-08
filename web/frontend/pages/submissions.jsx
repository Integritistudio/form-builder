import { useState } from "react";
import { Page, Layout, Banner } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "../utils/api";
import { AppShell, PageHero, AppPagination } from "../components/layout";
import SubmissionsTable from "../components/submissions/SubmissionsTable";
import SubmissionDetailModal from "../components/SubmissionDetailModal";

export default function AllSubmissionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [formFilter, setFormFilter] = useState("");
  const [daysFilter, setDaysFilter] = useState("0");
  const [selected, setSelected] = useState(null);

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
  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <AppShell>
      <Page fullWidth>
        <TitleBar title="Submissions" />

        <Layout>
          <Layout.Section>
            <PageHero
              title="Submissions"
              subtitle="View and manage responses from all your storefront forms."
              meta={
                total > 0 ? (
                  <span className="app-badge-inline">
                    {total} total
                  </span>
                ) : null
              }
            />
          </Layout.Section>

          <Layout.Section>
            <div className="app-panel app-section-gap">
              <div className="app-panel-body">
                <div className="app-filters">
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

            <SubmissionsTable
              submissions={submissions}
              loading={isLoading}
              showForm
              onView={setSelected}
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
      </Page>
    </AppShell>
  );
}
