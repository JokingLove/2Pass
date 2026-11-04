import { ReactNode, useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import "../styles/ToolPage.css";

export function useToolText() {
  const { i18n } = useTranslation();
  return (zh: string, en: string) => i18n.language.startsWith("zh") ? zh : en;
}

export default function ToolPage({ title, code, description, children }: {
  title: string; code: string; description?: string; children: ReactNode;
}) {
  return (
    <section className="tool-page">
      <div className="tool-inner">
        <header className="tool-heading">
          <div className="tool-kicker"><span aria-hidden="true" />{code}</div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

export function ToolDialog({ title, onClose, busy = false, children }: {
  title: string; onClose: () => void; busy?: boolean; children: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const labelId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} className="tool-dialog" aria-labelledby={labelId} onCancel={e => {
      e.preventDefault();
      if (!busy) onClose();
    }}>
      <header><h2 id={labelId}>{title}</h2>
        <button className="tool-icon-btn" type="button" onClick={onClose} disabled={busy} aria-label={t("forms.close")}><Icon name="x" size={19} /></button>
      </header>
      {children}
    </dialog>
  );
}
