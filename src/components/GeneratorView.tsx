import { useTranslation } from "react-i18next";
import ToolPage, { useToolText } from "./ToolPage";
import PasswordGenerator from "./PasswordGenerator";

export default function GeneratorView() {
  const { t } = useTranslation();
  const label = useToolText();
  return (
    <ToolPage title={t("generator.title")} code="PASSWORD GENERATOR"
      description={label("选择长度和字符类型，即可生成并复制随机密码。", "Choose a length and character set, then copy your random password.")}>
      <PasswordGenerator />
    </ToolPage>
  );
}
