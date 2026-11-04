import { useId } from "react";
import { useGaCode } from "../hooks/useGaCode";
import Icon from "./Icon";

interface InlineGaCopyProps {
  secret: string;
  label: string;
  zh: boolean;
  copied: boolean;
  onCopy: () => void;
}

export default function InlineGaCopy({ secret, label, zh, copied, onCopy }: InlineGaCopyProps) {
  const { code, secondsLeft, error } = useGaCode(secret);
  const codeLabel = useId();
  const remaining = zh ? "剩余 " + secondsLeft + " 秒" : secondsLeft + " seconds remaining";
  return (
    <button
      type="button"
      className={"vault-quick vault-inline-ga" + (copied ? " is-copied" : "")}
      aria-label={label}
      aria-describedby={code ? codeLabel : undefined}
      title={error ? (zh ? "GA 密钥无效，请在详情中重新配置" : "Invalid GA key. Open details to configure it.") : label}
      disabled={error}
      onClick={onCopy}
    >
      {copied ? <Icon name="check" size={12} /> : <span className="vault-ga-badge">GA</span>}
      <code id={codeLabel}>{error ? (zh ? "不可用" : "Invalid") : code ? code.slice(0, 3) + " " + code.slice(3) : "••• •••"}</code>
      {!error && <small className="vault-ga-ttl" aria-hidden="true" title={remaining}>{secondsLeft}s</small>}
    </button>
  );
}
