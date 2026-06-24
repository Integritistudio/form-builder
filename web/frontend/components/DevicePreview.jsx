import { useState } from "react";
import { Button, ButtonGroup, Text, Box } from "@shopify/polaris";

const DEVICES = {
  laptop: { label: "Laptop", width: "100%", maxWidth: "1280px" },
  tablet: { label: "Tablet", width: "768px", maxWidth: "768px" },
  mobile: { label: "Mobile", width: "375px", maxWidth: "375px" },
};

export default function DevicePreview({ children }) {
  const [device, setDevice] = useState("laptop");
  const config = DEVICES[device];

  return (
    <Box>
      <Box paddingBlockEnd="300">
        <ButtonGroup segmented>
          {Object.entries(DEVICES).map(([key, { label }]) => (
            <Button
              key={key}
              pressed={device === key}
              onClick={() => setDevice(key)}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "16px 0",
        }}
      >
        <div
          style={{
            width: config.width,
            maxWidth: config.maxWidth,
            border: "2px solid #e1e3e5",
            borderRadius: device === "mobile" ? "24px" : "12px",
            overflow: "hidden",
            background: "#f6f6f7",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            transition: "width 0.2s ease",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              background: "#e1e3e5",
              borderBottom: "1px solid #c9cccf",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28c840" }} />
            <Text variant="bodySm" color="subdued" as="span" style={{ marginLeft: 8 }}>
              {config.label} preview
            </Text>
          </div>
          <div
            style={{
              maxHeight: "70vh",
              overflowY: "auto",
              background: "#ffffff",
              padding: device === "mobile" ? "8px" : "16px",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </Box>
  );
}
