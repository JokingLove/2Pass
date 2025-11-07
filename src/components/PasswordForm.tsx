import { useState, useEffect } from "react";
import { PasswordFormProps } from "../types";
import PasswordGenerator from "./PasswordGenerator";
import TotpConfig from "./TotpConfig";
import "../styles/PasswordForm.css";

function PasswordForm({ entry, onSave, onCancel }: PasswordFormProps) {
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [totpSecret, setTotpSecret] = useState<string | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTotpConfig, setShowTotpConfig] = useState(false);

  // 预定义的常用标签
  const commonTags = ["工作", "个人", "银行", "社交", "邮箱", "购物", "娱乐", "开发"];

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setUsername(entry.username);
      setPassword(entry.password);
      setUrl(entry.url);
      setNotes(entry.notes);
      setTotpSecret(entry.totp_secret);
      setTags(entry.tags || []);
    }
  }, [entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    const newEntry = {
      id: entry?.id || crypto.randomUUID(),
      title,
      username,
      password,
      url,
      notes,
      totp_secret: totpSecret,
      tags: tags.length > 0 ? tags : undefined,
      sort_order: entry?.sort_order, // 保留原有排序
      created_at: entry?.created_at || now,
      updated_at: now,
    };

    onSave(newEntry);
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSaveTotpSecret = (secret: string) => {
    setTotpSecret(secret);
    setShowTotpConfig(false);
  };

  const handleRemoveTotp = () => {
    setTotpSecret(undefined);
    setShowTotpConfig(false);
  };

  const handleGeneratedPassword = (generatedPassword: string) => {
    setPassword(generatedPassword);
    setShowGenerator(false);
  };

  return (
    <div className="form-overlay">
      <div className="form-container">
        <div className="form-header">
          <h2>{entry ? "✏️ 编辑密码" : "➕ 添加密码"}</h2>
          <button onClick={onCancel} className="close-btn">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label htmlFor="title">标题 *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：Gmail、银行账户"
              required
              autoFocus
              autoCorrect="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="url">网址</label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">用户名 *</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="用户名或邮箱"
              required
              autoCorrect="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码 *</label>
            <div className="password-input-group">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="input-btn"
                title="显示/隐藏"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerator(!showGenerator)}
                className="input-btn generate-btn"
                title="生成密码"
              >
                🎲
              </button>
            </div>
          </div>

          {showGenerator && (
            <div className="generator-section">
              <PasswordGenerator onGenerate={handleGeneratedPassword} />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="notes">备注</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="添加备注信息..."
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>🏷️ 标签</label>
            <div className="tags-container">
              {tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="tag-remove"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="tag-input-group">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagInputKeyPress}
                placeholder="输入标签，按回车添加"
                className="tag-input"
              />
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                className="tag-add-btn"
                disabled={!tagInput.trim()}
              >
                添加
              </button>
            </div>
            <div className="common-tags">
              {commonTags.filter(t => !tags.includes(t)).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="common-tag-btn"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>⏱️ Google Authenticator (TOTP)</label>
            <div className="totp-section">
              {totpSecret ? (
                <div className="totp-configured">
                  <span className="totp-status">✓ 已配置 TOTP</span>
                  <button
                    type="button"
                    onClick={() => setShowTotpConfig(true)}
                    className="totp-manage-btn"
                  >
                    🔧 管理
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTotpConfig(true)}
                  className="totp-add-btn"
                >
                  ➕ 添加 TOTP
                </button>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              取消
            </button>
            <button type="submit" className="save-btn">
              💾 保存
            </button>
          </div>
        </form>

        {showTotpConfig && (
          <TotpConfig
            currentSecret={totpSecret}
            accountName={title || "账户"}
            onSave={handleSaveTotpSecret}
            onRemove={handleRemoveTotp}
            onClose={() => setShowTotpConfig(false)}
          />
        )}
      </div>
    </div>
  );
}

export default PasswordForm;

