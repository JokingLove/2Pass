import { useTranslation } from "react-i18next";
import Modal from "./Modal";

interface ConfirmDialogProps {
  title:string; message:string; confirmText?:string; cancelText?:string;
  type?:"info"|"warning"|"danger"|"success"; onConfirm:()=>void; onCancel:()=>void;
}
export default function ConfirmDialog({title,message,confirmText,cancelText,type="info",onConfirm,onCancel}:ConfirmDialogProps) {
  const {t} = useTranslation();
  return <Modal narrow title={title} icon={type==="danger" ? "trash" : "info"} danger={type==="danger"} onClose={onCancel}>
    <div className="vm-fields"><p className="vm-message">{message}</p></div>
    <div className="vm-actions">{cancelText!=="" && <button className="vm-button" onClick={onCancel}>{cancelText ?? t("forms.cancel")}</button>}
    <button className={`vm-button ${type==="danger"?"is-danger":"is-primary"}`} onClick={onConfirm}>{confirmText ?? t("forms.confirm")}</button></div>
  </Modal>;
}
