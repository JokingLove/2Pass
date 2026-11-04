import { useLayoutEffect, useId, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Icon from "./Icon";
import "../styles/Modal.css";

export default function Modal({ title, icon, onClose, children, narrow, busy, danger }: {
  title:string; icon:string; onClose:()=>void; children:ReactNode; narrow?:boolean; busy?:boolean; danger?:boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const { t } = useTranslation();
  useLayoutEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return <dialog ref={ref} aria-labelledby={id} className={`vault-modal ${narrow ? "is-narrow" : ""}`}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="vm-header">
      <span className={`vm-symbol ${danger ? "is-danger" : ""}`}><Icon name={icon} size={20}/></span>
      <h2 id={id}>{title}</h2>
      <button className="vm-icon" type="button" disabled={busy} onClick={onClose} aria-label={t("forms.close")}><Icon name="x" size={18}/></button>
    </header>
    {children}
  </dialog>;
}
