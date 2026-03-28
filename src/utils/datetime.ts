import { DateTime, Settings } from "luxon";
import i18n from "../i18n";

/**
 * Maps i18next language codes to BCP 47 locale tags used by Luxon / Intl.
 * The `outputCalendar` key lets Luxon render dates in the locale's native
 * calendar system (e.g. Persian/Solar Hijri for Farsi).
 */
const LOCALE_MAP: Record<string, { locale: string; outputCalendar?: string }> =
  {
    en: { locale: "en-US" },
    fa: { locale: "fa-IR", outputCalendar: "persian" },
  };

function getLocaleSettings() {
  const lang = i18n.language ?? "en";
  return LOCALE_MAP[lang] ?? { locale: lang };
}

/**
 * Apply the current i18n language as Luxon's default locale so that
 * DateTime instances created without an explicit locale follow the app locale.
 * Call this once during app startup and again whenever the language changes.
 */
export function syncLuxonLocale() {
  const { locale } = getLocaleSettings();
  Settings.defaultLocale = locale;
}

/**
 * Returns a DateTime set to now, using the current app locale.
 */
export function nowLocalized(): DateTime {
  const { locale, outputCalendar } = getLocaleSettings();
  return DateTime.now().reconfigure({ locale, outputCalendar });
}

/**
 * Parses an ISO 8601 string and returns a locale-aware DateTime.
 */
export function fromISOLocalized(iso: string): DateTime {
  const { locale, outputCalendar } = getLocaleSettings();
  return DateTime.fromISO(iso).reconfigure({ locale, outputCalendar });
}

/**
 * Parses a Unix timestamp (seconds) and returns a locale-aware DateTime.
 */
export function fromUnixLocalized(seconds: number): DateTime {
  const { locale, outputCalendar } = getLocaleSettings();
  return DateTime.fromSeconds(seconds).reconfigure({ locale, outputCalendar });
}

// Keep Luxon in sync whenever the language changes.
i18n.on("languageChanged", syncLuxonLocale);

// Apply once on module load.
syncLuxonLocale();
