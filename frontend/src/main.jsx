import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App.jsx";
import { pushManager } from "@/lib/pushManager";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    pushManager.registerSW();
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
