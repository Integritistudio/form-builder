import { useState } from "react";
import { Page, Layout, Banner } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useQuery } from "react-query";
import { useParams, useNavigate } from "react-router-dom";

import { apiFetch } from "../../../utils/api";
import { AppShell, PageHero, AppPagination } from "../../../components/layout";
import SubmissionsTable from "../../../components/submissions/SubmissionsTable";
import SubmissionDetailModal from "../../../components/SubmissionDetailModal";

export default function SubmissionsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery(["submissions", id, page], () =>
    apiFetch(`/api/forms/${id}/submissions?page=${page}&limit=20`)
  );

  const submissions = data?.submissions || [];
  const form = data?.form;
  const total = data?.pagination?.total || 0;
  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <AppShell>
      <Page
        backAction={{ onAction: () => navigate(`/forms/${id}`) }}
      >
        <TitleBar title="Submissions" />

        <Layout>
          <Layout.Section>
            <PageHero
              title={form ? `Submissions — ${form.name}` : "Submissions"}
              subtitle={
                total
                  ? `${total} submission${total === 1 ? "" : "s"} on this form`
                  : "Responses from this form will appear here."
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
      </Page>
    </AppShell>
  );
}
