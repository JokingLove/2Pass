import { useState } from "react";
import "../styles/Changelog.css";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

const changelogData: ChangelogEntry[] = [
  {
    version: "v1.3.0",
    date: "2025-11-07",
    changes: [
      "新增密码强度实时检测功能",
      "新增密码卡片折叠/展开功能",
      "新增搜索结果高亮显示",
      "新增剪贴板30秒自动清空",
      "新增全局快捷键支持（Cmd/Ctrl + N/F/L）",
      "优化快速复制：自动识别TOTP并复制组合密码",
      "优化UI设计：统一信息行样式",
      "优化标签系统：6种淡色自动循环",
      "优化TOTP显示：更紧凑的布局",
    ],
  },
  {
    version: "v1.2.0",
    date: "2025-11-05",
    changes: [
      "新增可拖动调整侧边栏宽度",
      "新增TOTP支持",
      "新增组合密码功能",
      "优化拖动排序体验",
    ],
  },
  {
    version: "v1.1.0",
    date: "2025-11-01",
    changes: [
      "新增标签功能",
      "新增密码生成器",
      "新增自动锁定功能",
      "优化搜索功能",
    ],
  },
  {
    version: "v1.0.0",
    date: "2025-10-20",
    changes: [
      "首次发布",
      "基础密码管理功能",
      "AES-256加密",
      "本地存储",
    ],
  },
];

function Changelog() {
  const [isExpanded, setIsExpanded] = useState(false);
  const latestEntry = changelogData[0];

  return (
    <div className="changelog-container">
      <div 
        className="changelog-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="changelog-latest">
          <span className="changelog-version">{latestEntry.version}</span>
          <span className="changelog-date">更新于 {latestEntry.date}</span>
        </div>
        <button className="changelog-toggle">
          {isExpanded ? "▼" : "▶"}
        </button>
      </div>

      {isExpanded && (
        <div className="changelog-timeline">
          {changelogData.map((entry, index) => (
            <div key={entry.version} className="changelog-entry">
              <div className="timeline-dot" />
              <div className="entry-content">
                <div className="entry-header">
                  <span className="entry-version">{entry.version}</span>
                  <span className="entry-date">{entry.date}</span>
                </div>
                <ul className="entry-changes">
                  {entry.changes.map((change, i) => (
                    <li key={i}>{change}</li>
                  ))}
                </ul>
              </div>
              {index < changelogData.length - 1 && <div className="timeline-line" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Changelog;
