// Restrict saved tones to this palette. Arbitrary vault text never becomes CSS.
export const identityPalette = [
  { id: "graphite", zh: "石墨灰", en: "Graphite" },
  { id: "denim", zh: "雾霾蓝", en: "Denim" },
  { id: "lilac", zh: "烟紫", en: "Lilac" },
  { id: "rosewood", zh: "灰玫瑰", en: "Rosewood" },
  { id: "clay", zh: "陶土", en: "Clay" },
  { id: "sand", zh: "亚麻", en: "Flax" },
] as const;

type Tone = (typeof identityPalette)[number]["id"];

export function identityTone(seed: string, savedColor?: string): Tone {
  const chosen = identityPalette.find(tone => tone.id === savedColor);
  if (chosen) return chosen.id;
  let hash = 2166136261;
  for (const character of seed.normalize("NFC")) {
    hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619);
  }
  return identityPalette[(hash >>> 0) % identityPalette.length].id;
}

export function randomIdentityTone(current: string): Tone {
  const options = identityPalette.filter(tone => tone.id !== current);
  return options[Math.floor(Math.random() * options.length)].id;
}

export function tagTone(tag: string): Tone {
  return identityTone("tag:" + tag.trim().normalize("NFKC").toLowerCase());
}
