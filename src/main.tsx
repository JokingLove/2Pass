import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/IdentityColors.css";
import "./styles/common.css";    // 公共组件样式
import "./i18n";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
