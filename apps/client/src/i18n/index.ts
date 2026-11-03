import { tr, type TranslationKey } from './tr';
import { en } from './en';
import { useSettings } from '../state/settings';

export type Locale = 'tr' | 'en';
export type { TranslationKey };

const dictionaries: Record<Locale, Partial<Record<TranslationKey, string>>> = { tr, en };

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'tr', label: 'Türkçe' },
  { id: 'en', label: 'English (kısmi)' },
];

/** Translates `key` with `{param}` interpolation; falls back to Turkish, then to the key itself. */
export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const k = key as TranslationKey;
  let s = dictionaries[locale][k] ?? tr[k] ?? key;
  if (params) for (const [p, v] of Object.entries(params)) s = s.replaceAll(`{${p}}`, String(v));
  return s;
}

/** React hook returning a translator bound to the current locale. */
export function useT() {
  const locale = useSettings((s) => s.locale);
  return (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
}

/** Non-React access (game controller, audio…). */
export const t = (key: string, params?: Record<string, string | number>) =>
  translate(useSettings.getState().locale, key, params);
