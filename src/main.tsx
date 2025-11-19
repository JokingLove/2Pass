import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/variables.css"; // 全局设计令牌
import "./styles/themes.css";    // 主题颜色变量
import "./styles/common.css";    // 公共组件样式
import "./i18n";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
