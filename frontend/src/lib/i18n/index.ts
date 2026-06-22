import { en } from './en';
import { id } from './id';

export type Language = 'en' | 'id';
export type TranslationKey = keyof typeof en;

export const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  en,
  id,
};

export const LANGUAGES: { value: Language; labelKey: TranslationKey }[] = [
  { value: 'en', labelKey: 'lang.english' },
  { value: 'id', labelKey: 'lang.indonesian' },
];
