import {
  TextField,
  Select,
  Stack,
  Text,
  Box,
} from "@shopify/polaris";
import { resolveColor } from "../../lib/formStyles.js";

function normalizeToken(value, fallback) {
  if (!value) return { type: "solid", color: fallback };
  if (typeof value === "string") return { type: "solid", color: value };
  return value;
}

export default function ColorControl({
  label,
  value,
  onChange,
  allowGradient = true,
  fallback = "#ffffff",
}) {
  const token = normalizeToken(value, fallback);
  const isGradient = token.type === "gradient";

  function setSolid(color) {
    onChange(color);
  }

  function setGradient(patch) {
    onChange({
      type: "gradient",
      from: token.from || fallback,
      to: token.to || "#f0f0f0",
      angle: token.angle ?? 180,
      ...patch,
    });
  }

  return (
    <Box paddingBlockEnd="300">
      <Stack vertical spacing="tight">
        <Text variant="bodyMd" fontWeight="semibold">
          {label}
        </Text>
        {allowGradient && (
          <Select
            label="Type"
            labelHidden
            options={[
              { label: "Solid", value: "solid" },
              { label: "Gradient", value: "gradient" },
            ]}
            value={isGradient ? "gradient" : "solid"}
            onChange={(v) => {
              if (v === "gradient") {
                setGradient({
                  from: typeof value === "string" ? value : token.color || fallback,
                  to: "#f0f0f0",
                  angle: 180,
                });
              } else {
                setSolid(resolveColor(token, fallback));
              }
            }}
          />
        )}
        {!isGradient ? (
          <TextField
            label={`${label} color`}
            labelHidden
            value={typeof value === "string" ? value : token.color || fallback}
            onChange={setSolid}
            autoComplete="off"
            connectedLeft={
              <input
                type="color"
                value={typeof value === "string" ? value : token.color || fallback}
                onChange={(e) => setSolid(e.target.value)}
                style={{ width: 36, height: 36, border: "none", cursor: "pointer" }}
              />
            }
          />
        ) : (
          <Stack vertical spacing="tight">
            <TextField
              label="From"
              value={token.from || ""}
              onChange={(v) => setGradient({ from: v })}
              autoComplete="off"
              connectedLeft={
                <input
                  type="color"
                  value={token.from || fallback}
                  onChange={(e) => setGradient({ from: e.target.value })}
                  style={{ width: 36, height: 36, border: "none", cursor: "pointer" }}
                />
              }
            />
            <TextField
              label="To"
              value={token.to || ""}
              onChange={(v) => setGradient({ to: v })}
              autoComplete="off"
              connectedLeft={
                <input
                  type="color"
                  value={token.to || "#f0f0f0"}
                  onChange={(e) => setGradient({ to: e.target.value })}
                  style={{ width: 36, height: 36, border: "none", cursor: "pointer" }}
                />
              }
            />
            <TextField
              label="Angle (deg)"
              type="number"
              value={String(token.angle ?? 180)}
              onChange={(v) => setGradient({ angle: parseInt(v, 10) || 0 })}
              autoComplete="off"
            />
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
