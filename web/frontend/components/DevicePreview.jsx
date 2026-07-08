import { useState } from "react";
import { Button, ButtonGroup } from "@shopify/polaris";

const DEVICES = {
  laptop: { label: "Desktop", width: "100%", maxWidth: "100%" },
  tablet: { label: "Tablet", width: "768px", maxWidth: "768px" },
  mobile: { label: "Mobile", width: "375px", maxWidth: "375px" },
};

export default function DevicePreview({ children }) {
  const [device, setDevice] = useState("laptop");
  const config = DEVICES[device];

  return (
    <div className="dp-wrap">
      <div className="dp-toolbar">
        <ButtonGroup segmented>
          {Object.entries(DEVICES).map(([key, { label }]) => (
            <Button
              key={key}
              pressed={device === key}
              onClick={() => setDevice(key)}
              size="slim"
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
      </div>
      <div className="dp-stage">
        <div
          className={`dp-frame dp-frame--${device}`}
          style={{ width: config.width, maxWidth: config.maxWidth }}
        >
          <div className="dp-chrome">
            <span className="dp-dot dp-dot--red" />
            <span className="dp-dot dp-dot--yellow" />
            <span className="dp-dot dp-dot--green" />
            <span className="dp-chrome-label">{config.label} preview</span>
          </div>
          <div className="dp-viewport">{children}</div>
        </div>
      </div>
    </div>
  );
}
