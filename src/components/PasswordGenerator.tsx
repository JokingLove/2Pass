import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCopy } from "../hooks/useCopy";
import { calculateStrength } from "../utils/passwordStrength";
import Icon from "./Icon";
import { useToolText } from "./ToolPage";
import "../styles/PasswordGenerator.css";

const sets = [
  ["ABCDEFGHIJKLMNOPQRSTUVWXYZ", "A–Z", "大写字母", "Uppercase"],
  ["abcdefghijklmnopqrstuvwxyz", "a–z", "小写字母", "Lowercase"],
  ["0123456789", "0–9", "数字", "Numbers"],
  ["!@#$%^&*()_+-=[]{}|;:,.<>?", "#&!", "符号", "Symbols"],
];

function generate(length: number, selected: boolean[]) {
  const enabled = sets.filter((_, index) => selected[index]).map(([chars]) => chars);
  const alphabet = enabled.join("");
  // Rejection sampling avoids modulo bias and ensures each selected group occurs.
  const limit = 256 - 256 % alphabet.length;
  const bytes = new Uint8Array(length * 2);
  for (;;) {
    let output = "";
    while (output.length < length) {
      crypto.getRandomValues(bytes);
      for (const byte of bytes) {
        if (byte < limit) output += alphabet[byte % alphabet.length];
        if (output.length === length) break;
      }
    }
    if (enabled.every(chars => [...output].some(char => chars.includes(char)))) return output;
  }
}

export default function PasswordGenerator({ onGenerate }: { onGenerate?: (password: string) => void }) {
  const { t } = useTranslation();
  const label = useToolText();
  const [length, setLength] = useState(20);
  const [enabled, setEnabled] = useState([true, true, true, true]);
  const [password, setPassword] = useState(() => generate(20, [true, true, true, true]));
  const [error, setError] = useState(false);
  const { isCopied, copyToClipboard } = useCopy();
  const rangeId = useId();
  const count = enabled.filter(Boolean).length;
  const level = calculateStrength(password).level;
  const strength = t("generator.strength." + (level === "medium" ? "fair" : level));
  const update = (nextLength: number, nextEnabled: boolean[]) => {
    setLength(nextLength);
    setEnabled(nextEnabled);
    setError(false);
    setPassword(generate(nextLength, nextEnabled));
  };
  return (
    <div className={'gen-workbench' + (onGenerate ? ' gen-inline' : '')}>
      <div className="gen-output">
        <div className="gen-output-head"><span className="tool-caption"><Icon name="key" size={14} />{t("generator.passwordGenerated")}</span>
          <span className="gen-length-label">{t("generator.strength.label")} · {strength}</span>
        </div>
        <code className="gen-secret" dir="ltr">{password}</code>
        <div className="gen-commands">
          <button type="button" className="tool-btn tool-accent" onClick={async () => {
            if (onGenerate) return onGenerate(password);
            try { await copyToClipboard(password, password); setError(false); } catch { setError(true); }
          }}>
            <Icon name={onGenerate ? "key" : isCopied(password) ? "check" : "copy"} size={16} />
            {onGenerate ? label("使用此密码", "Use this password") : isCopied(password) ? t("generator.passwordCopied") : label("复制密码", "Copy password")}
          </button>
          <button type="button" className="tool-btn" onClick={() => update(length, enabled)}><Icon name="refresh" size={16} />{label("重新生成", "Regenerate")}</button>
        </div>
        {error && <p className="tool-notice" role="alert">{label("未能复制，请选择密码手动复制。", "Copy failed. Select the password to copy it manually.")}</p>}
      </div>
      <div className="gen-settings">
        <div className="gen-range">
          <label htmlFor={rangeId}>{label("密码长度", "Password length")}<output htmlFor={rangeId}>{length}</output></label>
          <input id={rangeId} type="range" min="8" max="64" value={length} onChange={e => update(Number(e.target.value), enabled)} />
          <div className="gen-bounds" aria-hidden="true"><span>8</span><span>64</span></div>
        </div>
        <fieldset className="gen-classes"><legend>{label("字符类型", "Character types")}</legend>
          {sets.map(([, sample, zh, en], i) => (
            <label className="gen-class" key={sample}>
              <input type="checkbox" checked={enabled[i]} disabled={enabled[i] && count === 1}
                onChange={e => update(length, enabled.map((on, index) => index === i ? e.target.checked : on))} />
              <span>{label(zh, en)}</span><small aria-hidden="true">{sample}</small>
            </label>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
