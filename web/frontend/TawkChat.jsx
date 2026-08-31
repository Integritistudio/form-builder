import { useEffect } from "react";

export default function TawkChat() {
  useEffect(() => {
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    window.Tawk_API.onBeforeLoad = function () {
      console.log("Tawk before load");
    };

    window.Tawk_API.onLoad = function () {
      console.log("Tawk loaded");
      console.log("Tawk API:", window.Tawk_API);
      console.log("Tawk status:", window.Tawk_API.getStatus());
    };

    const existingScript = document.querySelector(
      'script[src*="embed.tawk.to"]'
    );

    if (existingScript) {
      console.log("Tawk script already exists");
      return;
    }

    const script = document.createElement("script");

    script.async = true;
    script.src =
      'https://embed.tawk.to/6a95c27d35e8c13445d609a2/1k1cfvf5h';
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");

    script.onload = () => {
      console.log("Tawk script downloaded");
    };

    script.onerror = (error) => {
      console.error("Tawk script failed:", error);
    };

    document.body.appendChild(script);
  }, []);

  return null;
}
