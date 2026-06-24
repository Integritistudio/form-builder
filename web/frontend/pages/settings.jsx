import { useState, useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Checkbox,
  Button,
  Banner,
  Stack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useMutation, useQuery, useQueryClient } from "react-query";

import { apiFetch } from "../utils/api";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(["settings"], () =>
    apiFetch("/api/settings")
  );

  const [form, setForm] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (data?.settings) {
      setForm({ ...data.settings, smtpPassword: "" });
    }
  }, [data]);

  const saveMutation = useMutation(
    (payload) =>
      apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["settings"]);
        queryClient.invalidateQueries(["plan"]);
        setMessage({ status: "success", text: "Settings saved." });
      },
      onError: (err) => setMessage({ status: "critical", text: err.message }),
    }
  );

  const testMutation = useMutation(
    () => apiFetch("/api/settings/smtp/test", { method: "POST" }),
    {
      onSuccess: () =>
        setMessage({ status: "success", text: "Test email sent successfully." }),
      onError: (err) => setMessage({ status: "critical", text: err.message }),
    }
  );

  if (isLoading || !form) {
    return <Page title="Email settings" />;
  }

  return (
    <Page title="Email settings">
      <TitleBar title="Email settings" />

      <Layout>
        {message && (
          <Layout.Section>
            <Banner
              status={message.status}
              onDismiss={() => setMessage(null)}
            >
              {message.text}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <Card title="SMTP server" sectioned>
            <FormLayout>
              <TextField
                label="SMTP host"
                value={form.smtpHost}
                onChange={(v) => setForm({ ...form, smtpHost: v })}
                placeholder="smtp.example.com"
                autoComplete="off"
              />
              <TextField
                label="SMTP port"
                type="number"
                value={String(form.smtpPort)}
                onChange={(v) => setForm({ ...form, smtpPort: v })}
                autoComplete="off"
              />
              <TextField
                label="SMTP username"
                value={form.smtpUser}
                onChange={(v) => setForm({ ...form, smtpUser: v })}
                autoComplete="off"
              />
              <TextField
                label="SMTP password"
                type="password"
                value={form.smtpPassword}
                onChange={(v) => setForm({ ...form, smtpPassword: v })}
                helpText={
                  form.hasPassword
                    ? "Leave blank to keep existing password."
                    : undefined
                }
                autoComplete="off"
              />
              <Checkbox
                label="Use TLS/SSL"
                checked={form.smtpSecure}
                onChange={(v) => setForm({ ...form, smtpSecure: v })}
              />
            </FormLayout>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card title="Recipients" sectioned>
            <FormLayout>
              <TextField
                label="Send submissions to"
                type="email"
                value={form.emailTo}
                onChange={(v) => setForm({ ...form, emailTo: v })}
                helpText="Required to receive submission emails"
                autoComplete="off"
              />
              <TextField
                label="CC (optional)"
                type="email"
                value={form.emailCc}
                onChange={(v) => setForm({ ...form, emailCc: v })}
                autoComplete="off"
              />
            </FormLayout>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Stack spacing="tight">
            <Button
              primary
              loading={saveMutation.isLoading}
              onClick={() => saveMutation.mutate(form)}
            >
              Save settings
            </Button>
            <Button
              loading={testMutation.isLoading}
              onClick={() => testMutation.mutate()}
            >
              Send test email
            </Button>
          </Stack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
