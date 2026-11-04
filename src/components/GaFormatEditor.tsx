import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatCombined, isValidGaSeparator, type CombineFormat } from "../utils/quickCopy";
import "../styles/GaFormatEditor.css";

interface GaFormatEditorProps {
  format: CombineFormat;
  onChange: (format: CombineFormat) => void;
}

const samples = { password: "MyPass", code: "123456" };
const presets = [
  { value: "", zh: "无", en: "None" },
  { value: " ", zh: "空格", en: "Space" },
  { value: "-", zh: "短横线 -", en: "Dash -" },
  { value: ":", zh: "冒号 :", en: "Colon :" },
];

export default function GaFormatEditor({ format, onChange }: GaFormatEditorProps) {
  const { i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const prefix = useId();
  const [invalidDraft, setInvalidDraft] = useState<string | null>(null);
  const selectSeparator = (separator: string) => {
    if (separator !== "" && !isValidGaSeparator(separator)) {
      setInvalidDraft(separator);
      return;
    }
    setInvalidDraft(null);
    if (separator !== format.separator) onChange({ ...format, separator });
  };

  return (
    <fieldset className="ga-format">
      <legend>{zh ? "GA 拼接格式" : "GA combination format"}</legend>
      <div className="ga-format-body">
        <div className="ga-format-field">
          <span id={prefix + "-order"}>{zh ? "拼接顺序" : "Order"}</span>
          <div className="ga-order" role="group" aria-labelledby={prefix + "-order"}>
            {(["password-first", "ga-first"] as const).map(order => (
              <button key={order} type="button" aria-pressed={format.order === order}
                onClick={() => { if (order !== format.order) onChange({ ...format, order }); }}>
                {order === "password-first" ? (zh ? "密码在前" : "Password first") : (zh ? "GA 在前" : "GA first")}
              </button>
            ))}
          </div>
        </div>
        <div className="ga-format-field">
          <span id={prefix + "-separator"}>{zh ? "分隔符" : "Separator"}</span>
          <div className="ga-presets" role="group" aria-labelledby={prefix + "-separator"}>
            {presets.map(preset => (
              <button key={preset.value} type="button" aria-pressed={invalidDraft === null && format.separator === preset.value}
                onClick={() => selectSeparator(preset.value)}>
                {zh ? preset.zh : preset.en}
              </button>
            ))}
          </div>
          <label className="ga-custom" htmlFor={prefix + "-custom"}>
            <span>{zh ? "自定义分隔符" : "Custom separator"}</span>
            <input id={prefix + "-custom"} type="text" autoComplete="off" spellCheck={false}
              value={invalidDraft ?? format.separator}
              onChange={event => selectSeparator(event.target.value)}
              placeholder={zh ? "例如 ::" : "e.g. ::"}
              aria-invalid={invalidDraft !== null}
              aria-describedby={prefix + (invalidDraft !== null ? "-error" : "-hint")} />
          </label>
          {invalidDraft !== null ? (
            <p className="ga-error" role="alert" id={prefix + "-error"}>{zh ? "未应用：请使用 1–8 个标点或空格，或清空分隔符。" : "Not applied. Use 1–8 punctuation marks or spaces, or leave the separator empty."}</p>
          ) : (
            <p className="ga-format-hint" id={prefix + "-hint"}>{zh ? "可输入 1–8 个标点或空格，留空即无分隔符。" : "Use 1–8 punctuation marks or spaces, or leave it empty."}</p>
          )}
        </div>
        <div className="ga-preview">
          <span>{zh ? "示例预览" : "Example preview"}</span>
          <code>{formatCombined(samples.password, samples.code, format)}</code>
        </div>
        <p className="ga-format-hint">{zh ? "实际复制时会生成当前 GA 验证码。" : "Copying generates the current GA code."}</p>
      </div>
    </fieldset>
  );
}
