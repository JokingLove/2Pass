import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { PasswordFormProps } from "../types";
import PasswordGenerator from "./PasswordGenerator";
import TotpConfig from "./TotpConfig";
import { calculateStrength, getStrengthColor } from "../utils/passwordStrength";
import "../styles/PasswordForm.css";

function PasswordForm({ entry, groups, selectedGroupId, onSave, onCancel }: PasswordFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [iconId, setIconId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [totpSecret, setTotpSecret] = useState<string | undefined>();
  const [tags, setTags] = useState<string[]>([]);
  const [groupId, setGroupId] = useState<string | undefined>();
  const [tagInput, setTagInput] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTotpConfig, setShowTotpConfig] = useState(false);

  // 预定义的常用标签
  const commonTags = [t("passwords.commonTags.work"), t("passwords.commonTags.personal"), t("passwords.commonTags.banking"), t("passwords.commonTags.social"), t("passwords.commonTags.email"), t("passwords.commonTags.shopping"), t("passwords.commonTags.entertainment"), t("passwords.commonTags.development")];

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setIconId(entry.icon_id || "");
      setUsername(entry.username);
      setPassword(entry.password);
      setUrl(entry.url || []);
      setNotes(entry.notes);
      setTotpSecret(entry.totp_secret);
      setTags(entry.tags || []);
      setGroupId(entry.group_id);
    } else {
      // 新建时使用当前选中的分组
      setGroupId(selectedGroupId || undefined);
    }
  }, [entry, selectedGroupId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const now = Date.now();
    const newEntry = {
      id: entry?.id || crypto.randomUUID(),
      title,
      icon_id: iconId || undefined,
      username,
      password,
      url,
      notes,
      totp_secret: totpSecret,
      tags: tags.length > 0 ? tags : undefined,
      group_id: groupId,
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

  // 计算密码强度
  const passwordStrength = password ? calculateStrength(password) : null;

  // 翻译密码强度标签
  const getLocalizedStrengthLabel = (level: 'weak' | 'medium' | 'strong'): string => {
    switch (level) {
      case 'weak': return t("generator.strength.weak");
      case 'medium': return t("generator.strength.fair");
      case 'strong': return t("generator.strength.strong");
    }
  };

  // 翻译密码强度建议
  const getLocalizedSuggestions = (suggestions: string[]): string[] => {
    return suggestions.map(suggestion => {
      switch (suggestion) {
        case '至少需要 8 个字符': return t("passwords.strength.need8Chars");
        case '建议使用 12 个字符以上': return t("passwords.strength.recommend12Chars");
        case '添加小写字母': return t("passwords.strength.addLowercase");
        case '添加大写字母': return t("passwords.strength.addUppercase");
        case '添加数字': return t("passwords.strength.addNumbers");
        case '添加特殊符号': return t("passwords.strength.addSymbols");
        default: return suggestion;
      }
    });
  };

  return (
    <div className="form-overlay">
      <div className="form-container">
        <div className="form-header">
          <h2>{entry ? "✏️ " + t("passwords.editPassword") : "➕ " + t("passwords.addPassword")}</h2>
          <button onClick={onCancel} className="close-btn">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="password-form">
          <div className="form-group">
            <label htmlFor="title">{t("passwords.entryTitle")} *</label>
            <div className="title-input-group">
              <input
                type="text"
                className="icon-input"
                value={iconId}
                onChange={(e) => setIconId(e.target.value)}
                placeholder="🔑"
                maxLength={2}
                title={t("passwords.icon")}
              />
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("passwords.titlePlaceholder")}
                required
                autoFocus
                autoCorrect="off"
                className="title-input"
              />
            </div>
          </div>

          {groups.length > 0 && (
            <div className="form-group">
              <label htmlFor="group">📁 {t("passwords.group")}</label>
              <select
                id="group"
                value={groupId || ""}
                onChange={(e) => setGroupId(e.target.value || undefined)}
                className="group-select"
              >
                <option value="">{t("groups.noGroup")}</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.icon} {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="url">🌐 {t("passwords.website")}</label>
            <div className="url-list">
              {url.length === 0 ? (
                <div className="url-empty-state">
                  <span className="empty-icon">🔗</span>
                  <span className="empty-text">{t("passwords.noWebsites")}</span>
                </div>
              ) : (
                url.map((singleUrl, index) => (
                  <div key={index} className="url-item">
                    <span className="url-index">{index + 1}</span>
                    <input
                      type="url"
                      value={singleUrl}
                      onChange={(e) => {
                        const updatedUrls = [...url];
                        updatedUrls[index] = e.target.value;
                        setUrl(updatedUrls);
                      }}
                      placeholder={t("passwords.websitePlaceholder")}
                      className="url-input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setUrl(url.filter((_, i) => i !== index));
                      }}
                      className="url-remove-btn"
                      title={t("forms.delete")}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => setUrl([...url, ""])}
                className="url-add-btn"
              >
                <span className="btn-icon">➕</span>
                <span className="btn-text">{t("passwords.addWebsite")}</span>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">{t("passwords.username")} *</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("passwords.usernamePlaceholder")}
              required
              autoCorrect="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("passwords.password")} *</label>
            <div className="password-input-group">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwords.passwordPlaceholder")}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="input-btn"
                title={showPassword ? t("passwords.hidePassword") : t("passwords.showPassword")}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerator(!showGenerator)}
                className="input-btn generate-btn"
                title={t("generator.generate")}
              >
                🎲
              </button>
            </div>
            {passwordStrength && (
              <div className="password-strength">
                <div className="strength-bar-container">
                  <div
                    className={`strength-bar ${passwordStrength.level}`}
                    style={{
                      width: `${passwordStrength.percentage}%`,
                      backgroundColor: getStrengthColor(passwordStrength.level),
                    }}
                  />
                </div>
                <div className="strength-info">
                  <span className={`strength-label ${passwordStrength.level}`}>
                    {t("generator.strength.label")}: {getLocalizedStrengthLabel(passwordStrength.level)}
                  </span>
                  {passwordStrength.suggestions.length > 0 && (
                    <span className="strength-suggestions">
                      💡 {getLocalizedSuggestions(passwordStrength.suggestions).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {showGenerator && (
            <div className="generator-section">
              <PasswordGenerator onGenerate={handleGeneratedPassword} />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="notes">{t("passwords.notes")}</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("passwords.notesPlaceholder")}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>🏷️ {t("passwords.tags")}</label>
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
                placeholder={t("passwords.tagPlaceholder")}
                className="tag-input"
              />
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                className="tag-add-btn"
                disabled={!tagInput.trim()}
              >
                {t("forms.add")}
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
            <label>⏱️ {t("totp.googleAuthenticator")}</label>
            <div className="totp-section">
              {totpSecret ? (
                <div className="totp-configured">
                  <span className="totp-status">✓ {t("totp.configured")}</span>
                  <button
                    type="button"
                    onClick={() => setShowTotpConfig(true)}
                    className="totp-manage-btn"
                  >
                    🔧 {t("totp.manage")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTotpConfig(true)}
                  className="totp-add-btn"
                >
                  ➕ {t("totp.addTotp")}
                </button>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              {t("forms.cancel")}
            </button>
            <button type="submit" className="save-btn">
              💾 {t("forms.save")}
            </button>
          </div>
        </form>

        {showTotpConfig && (
          <TotpConfig
            currentSecret={totpSecret}
            accountName={title || t("passwords.account")}
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

