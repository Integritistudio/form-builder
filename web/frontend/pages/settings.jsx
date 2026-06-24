import { useState, useEffect, useMemo } from "react";
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
  Select,
  Text,
  Box,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useMutation, useQuery, useQueryClient } from "react-query";

import { apiFetch } from "../utils/api";

const SMTP_PRESETS = [
  {
    id: "custom",
    label: "Custom",
    host: "",
    port: "587",
    secure: false,
    hint: "",
  },
  {
    id: "gmail",
    label: "Gmail",
    host: "smtp.gmail.com",
    port: "587",
    secure: false,
    hint: "Use an App Password if 2FA is enabled on your Google account.",
  },
  {
    id: "outlook",
    label: "Outlook / Office 365",
    host: "smtp.office365.com",
    port: "587",
    secure: false,
    hint: "Use your full Microsoft account email as the username.",
  },
  {
    id: "yahoo",
    label: "Yahoo Mail",
    host: "smtp.mail.yahoo.com",
    port: "587",
    secure: false,
    hint: "Generate an app password in Yahoo account security settings.",
  },
  {
    id: "zoho",
    label: "Zoho Mail",
    host: "smtp.zoho.com",
    port: "587",
    secure: false,
    hint: "",
  },
  {
    id: "icloud",
    label: "iCloud Mail",
    host: "smtp.mail.me.com",
    port: "587",
    secure: false,
    hint: "Use an app-specific password from appleid.apple.com.",
  },
  {
    id: "sendgrid",
    label: "SendGrid",
    host: "smtp.sendgrid.net",
    port: "587",
    secure: false,
    hint: 'Username is literally "apikey"; password is your SendGrid API key.',
  },
  {
    id: "mailgun",
    label: "Mailgun",
    host: "smtp.mailgun.org",
    port: "587",
    secure: false,
    hint: "Use SMTP credentials from your Mailgun domain settings.",
  },
  {
    id: "ses",
    label: "Amazon SES",
    host: "email-smtp.us-east-1.amazonaws.com",
    port: "587",
    secure: false,
    hint: "Replace the region in the host if your SES endpoint differs.",
  },
  {
    id: "gmail_ssl",
    label: "Gmail (SSL port 465)",
    host: "smtp.gmail.com",
    port: "465",
    secure: true,
    hint: "Alternative Gmail setup using implicit SSL on port 465.",
  },
];

function matchPreset(form) {
  if (!form?.smtpHost) return "custom";
  const match = SMTP_PRESETS.find(
    (p) =>
      p.id !== "custom" &&
      p.host === form.smtpHost &&
      String(p.port) === String(form.smtpPort) &&
      p.secure === Boolean(form.smtpSecure)
  );
  return match?.id || "custom";
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(["settings"], () =>
    apiFetch("/api/settings")
  );

  const [form, setForm] = useState(null);
  const [message, setMessage] = useState(null);
  const [presetId, setPresetId] = useState("custom");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (data?.settings) {
      const next = { ...data.settings, smtpPassword: "" };
      setForm(next);
      setPresetId(matchPreset(next));
    }
  }, [data]);

  const activePreset = useMemo(
    () => SMTP_PRESETS.find((p) => p.id === presetId) || SMTP_PRESETS[0],
    [presetId]
  );

  function applyPreset(id) {
    setPresetId(id);
    const preset = SMTP_PRESETS.find((p) => p.id === id);
    if (!preset || preset.id === "custom") return;
    setForm((prev) => ({
      ...prev,
      smtpHost: preset.host,
      smtpPort: preset.port,
      smtpSecure: preset.secure,
    }));
  }

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
          <Banner status="info">
            If test emails fail with a timeout or DNS error, try disabling your VPN
            or firewall — many networks block outbound SMTP on ports 587 and 465.
            Submissions are still saved even when email delivery fails.
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card title="SMTP server" sectioned>
            <FormLayout>
              <Select
                label="Email provider"
                options={SMTP_PRESETS.map((p) => ({
                  label: p.label,
                  value: p.id,
                }))}
                value={presetId}
                onChange={applyPreset}
                helpText="Choose a provider to prefill host, port, and TLS settings."
              />
              {activePreset.hint && (
                <Box paddingBlockEnd="200">
                  <Text variant="bodySm" color="subdued">
                    {activePreset.hint}
                  </Text>
                </Box>
              )}
              <TextField
                label="SMTP host"
                value={form.smtpHost}
                onChange={(v) => {
                  setPresetId("custom");
                  setForm({ ...form, smtpHost: v });
                }}
                placeholder="smtp.example.com"
                autoComplete="off"
              />
              <TextField
                label="SMTP port"
                type="number"
                value={String(form.smtpPort)}
                onChange={(v) => {
                  setPresetId("custom");
                  setForm({ ...form, smtpPort: v });
                }}
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
                type={showPassword ? "text" : "password"}
                value={form.smtpPassword}
                onChange={(v) => setForm({ ...form, smtpPassword: v })}
                helpText={
                  form.hasPassword
                    ? "Leave blank to keep existing password."
                    : undefined
                }
                autoComplete="off"
                connectedRight={
                  <Button onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? "Hide" : "Show"}
                  </Button>
                }
              />
              <Checkbox
                label="Use TLS/SSL"
                checked={form.smtpSecure}
                onChange={(v) => {
                  setPresetId("custom");
                  setForm({ ...form, smtpSecure: v });
                }}
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
