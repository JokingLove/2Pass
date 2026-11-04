export const appearanceThemes = [
  { id: "default", zh: "瓷白", en: "Porcelain White" },
  { id: "slate", zh: "曜黑", en: "Graphite Black" },
  { id: "gold", zh: "黑金", en: "Black Gold" },
  { id: "rose", zh: "雾玫瑰", en: "Dusty Rose" },
] as const;

export type ThemeId = (typeof appearanceThemes)[number]["id"];
