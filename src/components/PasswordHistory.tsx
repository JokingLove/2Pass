import { PasswordHistory as PasswordHistoryType } from "../types";
import "../styles/PasswordHistory.css";

interface PasswordHistoryProps {
  history?: PasswordHistoryType[];
  updatedAt: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function PasswordHistory({ history, updatedAt, isExpanded, onToggle }: PasswordHistoryProps) {
  const hasHistory = history && history.length > 0;

  return (
    <div className="entry-history">
      <button 
        className="history-header"
        type="button"
        onClick={(e) => {
          console.log('🔵🔵🔵 CLICK EVENT FIRED! 🔵🔵🔵');
          e.preventDefault();
          e.stopPropagation();
          console.log('🔵 历史记录:', history);
          console.log('🔵 历史记录数量:', history?.length || 0);
          console.log('🔵 isExpanded:', isExpanded);
          console.log('🔵 hasHistory:', hasHistory);
          if (hasHistory) {
            console.log('🔵 调用 onToggle');
            onToggle();
          } else {
            console.log('⚠️ 没有历史记录，按钮被禁用');
          }
        }}
        onMouseDown={(e) => {
          console.log('🟡 MOUSEDOWN EVENT');
          e.stopPropagation();
        }}
        onMouseUp={(e) => {
          console.log('🟢 MOUSEUP EVENT');
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          console.log('🟣 TOUCHSTART EVENT');
          e.stopPropagation();
        }}
        disabled={!hasHistory}
        title={hasHistory ? "点击查看修改历史" : "暂无修改历史"}
      >
        <span className="history-date">
          更新于 {new Date(updatedAt).toLocaleDateString("zh-CN")}
        </span>
        {hasHistory && (
          <span className="history-toggle">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}
      </button>

      {isExpanded && hasHistory && (
        <div className="history-timeline">
          {history.map((record, index) => (
            <div key={index} className="history-entry">
              <div className="history-dot" />
              <div className="history-content">
                <span className="history-timestamp">
                  {new Date(record.timestamp).toLocaleString("zh-CN")}
                </span>
                {record.password && (
                  <div className="history-change">密码已更新</div>
                )}
                {record.username && (
                  <div className="history-change">用户名: {record.username}</div>
                )}
                {record.notes && (
                  <div className="history-change">备注: {record.notes}</div>
                )}
              </div>
              {index < history.length - 1 && <div className="history-line" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PasswordHistory;
