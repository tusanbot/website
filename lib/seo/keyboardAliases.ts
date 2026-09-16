const PERSIAN_KEYBOARD_TO_ENGLISH: Record<string, string> = {
  "ض": "q", "ص": "w", "ث": "e", "ق": "r", "ف": "t", "غ": "y", "ع": "u", "ه": "i", "خ": "o", "ح": "p", "ج": "[", "چ": "]",
  "ش": "a", "س": "s", "ی": "d", "ب": "f", "ل": "g", "ا": "h", "ت": "j", "ن": "k", "م": "l", "ک": ";", "گ": "'",
  "ظ": "z", "ط": "x", "ز": "c", "ر": "v", "ذ": "b", "د": "n", "ئ": "m", "و": ",", "پ": "\\", "ژ": "C",
  "آ": "H", "ة": "M", "ؤ": "J", "إ": "H", "أ": "H",
};

const ARABIC_TO_PERSIAN: Record<string, string> = {
  "ي": "ی", "ى": "ی", "ك": "ک", "ۀ": "ه", "ة": "ه", "ؤ": "و", "إ": "ا", "أ": "ا", "ـ": "",
};

function normalizePersian(value: string) {
  return value
    .normalize("NFC")
    .replace(/[\u200c\u200d\u200e\u200f]/g, " ")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .split("")
    .map((char) => ARABIC_TO_PERSIAN[char] ?? char)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Converts Persian text to the characters a user would likely produce with an English keyboard layout. */
export function toEnglishKeyboardAlias(value: string) {
  const normalized = normalizePersian(value);
  return normalized
    .split("")
    .map((char) => PERSIAN_KEYBOARD_TO_ENGLISH[char] ?? char)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulAlias(original: string, alias: string) {
  if (!alias || alias === original) return false;
  if (alias.length < 3 || alias.length > 100) return false;
  if (!/[a-z\[\];'\\]/i.test(alias)) return false;
  return /[\u0600-\u06ff]/.test(original);
}

/** Builds a small, deduplicated set of keyboard-layout variants from service SEO terms. */
export function buildKeyboardAliases(terms: string[], maxAliases = 16) {
  const aliases: string[] = [];
  const seen = new Set<string>();

  for (const term of terms) {
    const original = normalizePersian(String(term || ""));
    if (!original) continue;
    const alias = toEnglishKeyboardAlias(original);
    if (!isUsefulAlias(original, alias)) continue;

    const key = alias.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    aliases.push(alias);
    if (aliases.length >= maxAliases) break;
  }

  return aliases;
}
