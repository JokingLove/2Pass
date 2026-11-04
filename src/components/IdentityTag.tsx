import { useTranslation } from "react-i18next";
import { tagTone } from "../utils/identityColors";
import Icon from "./Icon";
import "../styles/EntryIdentity.css";

export default function IdentityTag({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  const { i18n } = useTranslation();
  const content = <><i aria-hidden="true" /><span className="identity-tag-label">{tag}</span></>;
  const tone = tagTone(tag);

  if (onRemove) {
    const label = i18n.language.startsWith("zh") ? "移除标签 " + tag : "Remove tag " + tag;
    return (
      <button className="identity-tag" type="button" data-identity-tone={tone} onClick={onRemove} title={label} aria-label={label}>
        {content}<Icon name="x" size={11} />
      </button>
    );
  }
  return <span className="identity-tag" data-identity-tone={tone} title={tag}>{content}</span>;
}
