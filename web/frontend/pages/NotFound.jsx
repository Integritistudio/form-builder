import { EmptyState, Page } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import { notFoundImage } from "../assets";
import { AppShell, PageHero } from "../components/layout";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <Page>
        <PageHero title={t("NotFound.heading")} subtitle={t("NotFound.description")} />
        <div className="app-panel">
          <div className="app-empty">
            <EmptyState heading={t("NotFound.heading")} image={notFoundImage}>
              <p>{t("NotFound.description")}</p>
            </EmptyState>
          </div>
        </div>
      </Page>
    </AppShell>
  );
}
