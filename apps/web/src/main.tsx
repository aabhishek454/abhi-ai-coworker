import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./features.css";

// Migrate only known stale model IDs from earlier builds; otherwise preserve the user's current model choice.
try {
  const key = localStorage.getItem("abhi-api-key") || "";
  const model = localStorage.getItem("abhi-model") || "";
  if (key.startsWith("sk-or-v1-") && (model === "openrouter/owl-alpha:free" || model === "stealth/ox-alpha")) {
    localStorage.setItem("abhi-base-url", "https://openrouter.ai/api/v1");
    localStorage.setItem("abhi-model", "openrouter/free");
  }
} catch {}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
