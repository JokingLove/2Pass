import { useEffect, useRef, useState, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import type { LoginProps } from "../types";
import { appearanceThemes } from "../utils/appearance";
import VaultMark from "./VaultMark";
import Icon from "./Icon";
import PassBackdrop, { PassRibbon } from "./PassArtwork";
import "../styles/Login.css";

type VaultState = "checking" | "locked" | "new" | "unavailable";
interface EntranceProps extends LoginProps {
  onDemo?: () => void | Promise<void>;
  theme: string;
  onThemeChange: (id: string) => void;
}

export default function Login({ onLogin, onDemo, theme, onThemeChange }: EntranceProps) {
  const { i18n, t } = useTranslation();
  const zh = !i18n.language.startsWith("en");
  const tr = (cn: string, en: string) => zh ? cn : en;
  const [state, setState] = useState<VaultState>("checking");
  const [revision, setRevision] = useState(0);
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const confirm = useRef<HTMLInputElement>(null);
  const isDemo = Boolean(onDemo);
  const creating = !isDemo && state === "new";

  useEffect(() => {
    if (isDemo) return;
    let current = true;
    setState("checking");
    setError("");
    invoke<boolean>("check_master_password_exists")
      .then(exists => { if (current) setState(exists ? "locked" : "new"); })
      .catch(() => { if (current) setState("unavailable"); });
    return () => { current = false; };
  }, [isDemo, revision]);

  useEffect(() => {
    if (!isDemo && (state === "locked" || state === "new")) field.current?.focus();
  }, [isDemo, state]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (onDemo) {
      setBusy(true);
      setError("");
      try {
        await onDemo();
      } catch {
        setError(tr("演示暂时无法打开，请重试。", "The demo could not be opened. Please try again."));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (state === "unavailable") { setRevision(v => v + 1); return; }
    if (state === "checking") return;
    setError("");
    if (creating && masterPassword.length < 8) {
      setError(t("changeMasterPassword.passwordTooShort"));
      field.current?.focus();
      return;
    }
    if (creating && confirmation !== masterPassword) {
      setError(t("changeMasterPassword.passwordMismatch"));
      confirm.current?.focus();
      return;
    }
    setBusy(true);
    try {
      if (creating) {
        await invoke("create_master_password", { masterPassword });
        setState("locked");
        setConfirmation("");
      } else if (!await invoke<boolean>("verify_master_password", { masterPassword })) {
        setError(t("login.wrongPassword"));
        field.current?.focus();
        field.current?.select();
        return;
      }
      await onLogin();
    } catch {
      setError(tr("保险库暂时无法打开，请重试。", "The vault could not be opened. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const title = isDemo
    ? tr("欢迎使用 2Pass", "Welcome to 2Pass")
    : creating ? tr("创建保险库", "Create your vault") : tr("解锁保险库", "Unlock your vault");
  const intro = isDemo
    ? tr("在示例空间中体验查找、复制和整理密码。", "Explore searching, copying, and organizing passwords in a sample workspace.")
    : creating
      ? tr("设置一个主密码，保护保存在此设备上的凭据。", "Set a master password to protect the credentials on this device.")
      : tr("输入主密码，打开这台设备上的私人空间。", "Enter your master password to open your private workspace on this device.");

  function actionLabel() {
    if (busy || (!isDemo && state === "checking")) return tr("请稍候…", "Please wait…");
    if (isDemo) return tr("进入演示保险库", "Open demo vault");
    if (state === "unavailable") return tr("重新连接", "Try again");
    return creating ? tr("创建保险库", "Create vault") : tr("解锁保险库", "Unlock vault");
  }

  function changeLanguage(language: string) {
    setError("");
    void i18n.changeLanguage(language);
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  }

  const hint = isDemo
    ? tr("请在 2Pass 应用内管理真实密码。", "Use the 2Pass app to manage real passwords.")
    : creating ? tr("请牢记主密码，丢失后将无法恢复。", "Keep your master password safe. It cannot be recovered.")
    : tr("主密码只用于解锁此设备上的保险库。", "Your master password unlocks the vault on this device.");

  return (
    <main className="lock-screen">
      <div className="pass-stage">
        <PassBackdrop theme={theme} />
        <div className="pass-language">
          <Icon name="globe" size={15} />
          <select
            aria-label={tr("界面语言", "Interface language")}
            value={zh ? "zh-CN" : "en-US"}
            onChange={event => changeLanguage(event.target.value)}
          >
            <option value="zh-CN">简体中文</option>
            <option value="en-US">English</option>
          </select>
          <Icon name="chevron-down" size={13} />
        </div>

        <div className="pass-stack">
          <section className="access-pass" aria-labelledby="lock-title">
            <header className="pass-head">
              <PassRibbon theme={theme} />
              <span className="pass-slot" aria-hidden="true" />
              <div className="pass-brand"><VaultMark width={38} height={38}/><span>2Pass</span></div>
              <div className="pass-caption">{tr("个人通行证", "Personal access pass")}</div>
              <svg className="pass-contactless" aria-hidden="true" focusable="false" width="26" height="28" viewBox="0 0 26 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 10a8 8 0 0 1 0 8m5-12a15 15 0 0 1 0 16m5-20a22 22 0 0 1 0 24"/>
              </svg>
            </header>

            <div className="pass-body">
              <h1 id="lock-title">{title}</h1>
              <p className="lock-intro">{intro}</p>
              <form className="lock-form" onSubmit={submit}>
                {isDemo ? (
                  <div className="pass-workspace">
                    <span className="pass-workspace-icon"><Icon name="folder" size={20}/></span>
                    <span className="pass-workspace-text">
                      <strong>{tr("示例工作区", "Sample workspace")}</strong>
                      <span>{tr("退出后清空本次更改", "Changes clear when you leave")}</span>
                    </span>
                    <span className="pass-mode">{tr("演示", "Demo")}</span>
                  </div>
                ) : state === "unavailable" ? (
                  <p className="lock-error" role="alert">
                    {tr("无法读取本地保险库，请重新连接。", "The local vault could not be reached. Please try connecting again.")}
                  </p>
                ) : (
                  <>
                    <div className="lock-field">
                      <label htmlFor="master-password" className="lock-label">{tr("主密码", "Master password")}</label>
                      <div className="lock-input-wrap">
                        <Icon name="key" size={17} />
                        <input
                          id="master-password"
                          ref={field}
                          type={revealed ? "text" : "password"}
                          value={masterPassword}
                          autoComplete={creating ? "new-password" : "current-password"}
                          onChange={event => { setMasterPassword(event.target.value); setError(""); }}
                          placeholder={creating ? tr("至少 8 个字符", "At least 8 characters") : tr("输入主密码", "Enter master password")}
                          disabled={state === "checking"}
                          required
                          aria-describedby={error ? "lock-error" : undefined}
                        />
                        <button
                          className="lock-reveal"
                          type="button"
                          onClick={() => setRevealed(value => !value)}
                          aria-pressed={revealed}
                          aria-label={revealed ? tr("隐藏密码", "Hide password") : tr("显示密码", "Show password")}
                        >
                          <Icon name={revealed ? "eye-off" : "eye"} size={17} />
                        </button>
                      </div>
                    </div>
                    {creating && (
                      <div className="lock-field">
                        <label htmlFor="confirm-password" className="lock-label">{tr("确认主密码", "Confirm master password")}</label>
                        <div className="lock-input-wrap">
                          <Icon name="key" size={17} />
                          <input
                            id="confirm-password"
                            ref={confirm}
                            type={revealed ? "text" : "password"}
                            value={confirmation}
                            onChange={event => { setConfirmation(event.target.value); setError(""); }}
                            autoComplete="new-password"
                            placeholder={tr("再次输入主密码", "Re-enter master password")}
                            required
                            aria-describedby={error ? "lock-error" : undefined}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                {error && <p className="lock-error" id="lock-error" role="alert">{error}</p>}
                <button className="lock-submit" type="submit" disabled={busy || (!isDemo && state === "checking")}>
                  <span>{actionLabel()}</span>
                  <Icon name={state === "unavailable" ? "refresh" : "arrow-right"} size={17} />
                </button>
              </form>
            </div>
            <p className="pass-note"><Icon name="shield" size={15} />{hint}</p>
          </section>
          <div className="pass-themes" role="group" aria-label={tr("外观主题", "Appearance")}>
            {appearanceThemes.map(option => (
              <button
                key={option.id}
                type="button"
                className="pass-theme"
                data-palette={option.id}
                title={tr(option.zh, option.en)}
                aria-pressed={theme === option.id}
                onClick={() => onThemeChange(option.id)}
              >
                <span className="pass-swatch" aria-hidden="true" />
                <span>{tr(option.zh, option.en)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
