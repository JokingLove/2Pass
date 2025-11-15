import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import "../styles/SyncConfig.css";

interface SyncConfigProps {
  onClose: () => void;
  onSave: () => void;
}

interface SyncStatus {
  enabled: boolean;
  provider?: string;
  version?: number;
  last_sync_time?: number;
}

function SyncConfig({ onClose, onSave }: SyncConfigProps) {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [enabled, setEnabled] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // OSS 配置字段
  const [ossProvider, setOssProvider] = useState<"aliyun" | "tencent">("aliyun");
  const [endpoint, setEndpoint] = useState("");
  const [bucket, setBucket] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [accessKeySecret, setAccessKeySecret] = useState("");
  const [region, setRegion] = useState("");
  const [path, setPath] = useState("2pass/data.json");

  useEffect(() => {
    loadProviders();
    loadSyncStatus();
  }, []);

  const loadProviders = async () => {
    try {
      const list = await invoke<string[]>("list_sync_providers");
      setProviders(list);
      if (list.length > 0 && !selectedProvider) {
        setSelectedProvider(list[0]);
      }
    } catch (err) {
      console.error("Failed to load providers:", err);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const status = await invoke<SyncStatus>("get_sync_status");
      setSyncStatus(status);
      setEnabled(status.enabled);
      if (status.provider) {
        setSelectedProvider(status.provider);
      }

      // 如果有配置，加载配置详情
      if (status.enabled && status.provider) {
        const config = await invoke<any>("get_sync_config");
        if (config) {
          // 这里应该解密配置数据，简化处理
          // 实际应该使用主密码解密
          try {
            const configData = JSON.parse(config.config_data);
            if (status.provider === "oss") {
              setOssProvider(configData.provider || "aliyun");
              setEndpoint(configData.endpoint || "");
              setBucket(configData.bucket || "");
              setAccessKeyId(configData.access_key_id || "");
              setAccessKeySecret(configData.access_key_secret || "");
              setRegion(configData.region || "");
              setPath(configData.path || "2pass/data.json");
            }
          } catch (e) {
            console.error("Failed to parse config:", e);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load sync status:", err);
    }
  };

  const validateOssConfig = (): string | null => {
    if (!endpoint.trim()) {
      return t("settings.sync.oss.endpointRequired");
    }
    if (!bucket.trim()) {
      return t("settings.sync.oss.bucketRequired");
    }
    if (!accessKeyId.trim()) {
      return t("settings.sync.oss.accessKeyIdRequired");
    }
    if (!accessKeySecret.trim()) {
      return t("settings.sync.oss.accessKeySecretRequired");
    }
    if (!path.trim()) {
      return t("settings.sync.oss.pathRequired");
    }
    return null;
  };

  const handleTestConnection = async () => {
    if (!selectedProvider) {
      setError(t("settings.sync.pleaseSelectMethod"));
      return;
    }

    // 验证必填字段
    if (selectedProvider === "oss") {
      const validationError = validateOssConfig();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const configJson = buildConfigJson();
      await invoke("test_sync_connection", {
        provider: selectedProvider,
        configJson: configJson,
      });
      setSuccess(t("settings.sync.testSuccess"));
    } catch (err: any) {
      setError(t("settings.sync.testFailed", { error: err }));
    } finally {
      setIsLoading(false);
    }
  };

  const buildConfigJson = (): string => {
    if (selectedProvider === "oss") {
      return JSON.stringify({
        provider: ossProvider,
        endpoint: endpoint,
        bucket: bucket,
        access_key_id: accessKeyId,
        access_key_secret: accessKeySecret,
        region: region || undefined,
        path: path,
      });
    }
    return "{}";
  };

  const handleSave = async () => {
    if (!selectedProvider) {
      setError(t("settings.sync.pleaseSelectMethod"));
      return;
    }

    // 验证必填字段
    if (selectedProvider === "oss") {
      const validationError = validateOssConfig();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const configJson = buildConfigJson();
      
      // 保存配置（这里简化处理，实际应该加密）
      await invoke("set_sync_config", {
        config: {
          provider: selectedProvider,
          enabled: enabled,
          config_data: configJson, // 实际应该加密
        },
      });

      setSuccess(t("settings.sync.saveSuccess"));
      setTimeout(() => {
        onSave();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(t("settings.sync.saveFailed", { error: err }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="sync-config-overlay">
      <div className="sync-config-container">
        <div className="sync-config-header">
          <h2>☁️ {t("settings.sync.configTitle")}</h2>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>

        <div className="sync-config-content">
          {error && <div className="sync-error">{error}</div>}
          {success && <div className="sync-success">{success}</div>}

          <div className="sync-section">
            <h3>{t("settings.sync.syncMethod")}</h3>
            <div className="provider-selector">
              {providers.map((provider) => (
                <button
                  key={provider}
                  className={`provider-btn ${selectedProvider === provider ? "active" : ""}`}
                  onClick={() => setSelectedProvider(provider)}
                >
                  {provider === "oss" && `☁️ ${t("settings.sync.oss.title")}`}
                  {provider === "github" && `🐙 ${t("settings.sync.github.title")}`}
                  {provider === "webdav" && `🌐 ${t("settings.sync.webdav.title")}`}
                </button>
              ))}
            </div>
          </div>

          {selectedProvider === "oss" && (
            <div className="sync-section">
              <h3>{t("settings.sync.oss.config")}</h3>
              <div className="form-group">
                <label>{t("settings.sync.oss.provider")}</label>
                <select
                  value={ossProvider}
                  onChange={(e) => setOssProvider(e.target.value as "aliyun" | "tencent")}
                >
                  <option value="aliyun">{t("settings.sync.oss.aliyun")}</option>
                  <option value="tencent">{t("settings.sync.oss.tencent")}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t("settings.sync.oss.endpoint")}</label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder={ossProvider === "aliyun" ? t("settings.sync.oss.endpointPlaceholderAliyun") : t("settings.sync.oss.endpointPlaceholderTencent")}
                />
              </div>

              <div className="form-group">
                <label>{t("settings.sync.oss.bucket")}</label>
                <input
                  type="text"
                  value={bucket}
                  onChange={(e) => setBucket(e.target.value)}
                  placeholder={t("settings.sync.oss.bucketPlaceholder")}
                />
              </div>

              <div className="form-group">
                <label>{t("settings.sync.oss.accessKeyId")}</label>
                <input
                  type="text"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  placeholder={t("settings.sync.oss.accessKeyIdPlaceholder")}
                />
              </div>

              <div className="form-group">
                <label>{t("settings.sync.oss.accessKeySecret")}</label>
                <input
                  type="password"
                  value={accessKeySecret}
                  onChange={(e) => setAccessKeySecret(e.target.value)}
                  placeholder={t("settings.sync.oss.accessKeySecretPlaceholder")}
                />
              </div>

              {ossProvider === "tencent" && (
                <div className="form-group">
                  <label>{t("settings.sync.oss.region")}</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder={t("settings.sync.oss.regionPlaceholder")}
                  />
                </div>
              )}

              <div className="form-group">
                <label>{t("settings.sync.oss.path")}</label>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder={t("settings.sync.oss.pathPlaceholder")}
                />
              </div>
            </div>
          )}

          <div className="sync-section">
            <div className="sync-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span>{t("settings.sync.enableSync")}</span>
              </label>
            </div>
            {syncStatus && syncStatus.last_sync_time && (
              <div className="sync-info">
                <p>{t("settings.sync.lastSyncTime", { time: new Date(syncStatus.last_sync_time * 1000).toLocaleString() })}</p>
                {syncStatus.version && <p>{t("settings.sync.syncVersion", { version: syncStatus.version })}</p>}
              </div>
            )}
          </div>

          <div className="sync-actions">
            <button
              onClick={handleTestConnection}
              className="test-btn"
              disabled={isLoading}
            >
              {isLoading ? t("settings.sync.testing") : `🔍 ${t("settings.sync.testConnection")}`}
            </button>
            <div className="action-buttons">
              <button onClick={onClose} className="cancel-btn">
                {t("forms.cancel")}
              </button>
              <button onClick={handleSave} className="save-btn" disabled={isLoading}>
                {isLoading ? t("settings.sync.saving") : `💾 ${t("settings.sync.saveConfig")}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SyncConfig;

