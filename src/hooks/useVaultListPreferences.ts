import { useEffect, useState } from "react";
import {
  defaultCombineFormat, isValidGaSeparator, quickCopyActions,
  type CombineFormat, type QuickCopyAction,
} from "../utils/quickCopy";

interface ListPreferences {
  actions: QuickCopyAction[];
  showDomain: boolean;
  showGroup: boolean;
  showUpdated: boolean;
  showTags: boolean;
  showGaDigits: boolean;
  combineFormat: CombineFormat;
}
interface StoredDisplay {
  version: 2;
  preferences: ListPreferences;
  entries: Record<string, QuickCopyAction[]>;
  formats: Record<string, CombineFormat>;
}

const storageKey = "2pass.list-display.v1";
const defaults: ListPreferences = {
  actions: ["username", "password", "totp", "combined"],
  showDomain: true, showGroup: true, showUpdated: true, showTags: true, showGaDigits: true,
  combineFormat: defaultCombineFormat,
};

function cleanActions(value: unknown, fallback: QuickCopyAction[]) {
  if (!Array.isArray(value)) return fallback;
  return [...new Set(value.filter((action): action is QuickCopyAction => quickCopyActions.includes(action)))].slice(0, 4);
}

function validFormat(value: unknown): value is CombineFormat {
  if (!value || typeof value !== "object") return false;
  const format = value as Partial<CombineFormat>;
  return (format.order === "password-first" || format.order === "ga-first") &&
    typeof format.separator === "string" && isValidGaSeparator(format.separator);
}

function readDisplay(): StoredDisplay {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || "{}");
    const prefs = data?.preferences || {};
    const enabled = (key: Exclude<keyof ListPreferences, "actions" | "combineFormat">) =>
      typeof prefs[key] === "boolean" ? prefs[key] : defaults[key];
    let actions = cleanActions(prefs.actions, defaults.actions);
    // The original UI saved its two default buttons even if the user never changed them.
    if (data?.version !== 2 && actions.length === 2 && actions[0] === "username" && actions[1] === "password") {
      actions = defaults.actions;
    }
    return {
      version: 2,
      preferences: {
        actions, showDomain: enabled("showDomain"), showGroup: enabled("showGroup"),
        showUpdated: enabled("showUpdated"), showTags: enabled("showTags"), showGaDigits: enabled("showGaDigits"),
        combineFormat: validFormat(prefs.combineFormat) ? prefs.combineFormat : defaultCombineFormat,
      },
      entries: Object.fromEntries(Object.entries(data?.entries || {})
        .filter(([, value]) => Array.isArray(value))
        .map(([id, entryActions]) => [id, cleanActions(entryActions, [])])),
      formats: Object.fromEntries(Object.entries(data?.formats || {})
        .filter((pair): pair is [string, CombineFormat] => validFormat(pair[1]))),
    };
  } catch {
    return { version: 2, preferences: defaults, entries: {}, formats: {} };
  }
}

function withOverride<T>(values: Record<string, T>, id: string, value: T | null) {
  if (value !== null) return { ...values, [id]: value };
  const next = { ...values };
  delete next[id];
  return next;
}

export function useVaultListPreferences() {
  const [display, setDisplay] = useState(readDisplay);
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(display)); }
    catch { /* A restricted browser can still use these choices for its current session. */ }
  }, [display]);

  const hasEntryActions = (id: string) => Object.prototype.hasOwnProperty.call(display.entries, id);
  const hasEntryFormat = (id: string) => Object.prototype.hasOwnProperty.call(display.formats, id);
  const getActions = (id: string) => hasEntryActions(id) ? display.entries[id] : display.preferences.actions;
  const getCombineFormat = (id: string) => hasEntryFormat(id) ? display.formats[id] : display.preferences.combineFormat;

  const setPreferences = (preferences: ListPreferences) => setDisplay(current => ({
    ...current,
    preferences: {
      ...preferences, actions: cleanActions(preferences.actions, defaults.actions),
      combineFormat: validFormat(preferences.combineFormat) ? preferences.combineFormat : current.preferences.combineFormat,
    },
  }));
  const setEntryActions = (id: string, actions: QuickCopyAction[] | null) => setDisplay(current => ({
    ...current, entries: withOverride(current.entries, id, actions === null ? null : cleanActions(actions, [])),
  }));
  const setEntryFormat = (id: string, format: CombineFormat | null) => {
    if (format !== null && !validFormat(format)) return;
    setDisplay(current => ({ ...current, formats: withOverride(current.formats, id, format) }));
  };

  return {
    preferences: display.preferences, setPreferences, getActions, hasEntryActions, setEntryActions,
    getCombineFormat, hasEntryFormat, setEntryFormat,
  };
}
