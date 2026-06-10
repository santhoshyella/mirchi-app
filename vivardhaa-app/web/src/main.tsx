import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Apply saved theme before first render to avoid flash
const savedTheme = localStorage.getItem("vv_theme");
if (savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", "dark");
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Vivardhaa: #root element not found in index.html");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
