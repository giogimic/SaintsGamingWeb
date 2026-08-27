/**
 * Saints Gaming — Comprehensive Multi-Language Localization, Dynamic Translation Keys & Fallback Engine (Bible 31 & Studio Plan Part 8)
 * Manages multi-locale dictionaries, variable string interpolation, pluralization, and missing translation coverage audits with graceful English fallback.
 */

export type LocaleCode =
  | 'EN_US'
  | 'ES_ES'
  | 'FR_FR'
  | 'DE_DE'
  | 'PT_BR'
  | 'JA_JP'
  | 'KO_KR'
  | 'ZH_CN';

export class LocalizationRegistryEngine {
  private currentLocale: LocaleCode = 'EN_US';
  private dictionaries = new Map<LocaleCode, Map<string, string>>();

  constructor() {
    this.dictionaries.set('EN_US', new Map());
  }

  /**
   * Sets the active locale for the runtime session.
   */
  public setLocale(locale: LocaleCode) {
    this.currentLocale = locale;
  }

  /**
   * Retrieves active locale.
   */
  public getLocale(): LocaleCode {
    return this.currentLocale;
  }

  /**
   * Registers a key-value dictionary for a given locale.
   */
  public registerLocaleDictionary(locale: LocaleCode, entries: Record<string, string>) {
    if (!this.dictionaries.has(locale)) {
      this.dictionaries.set(locale, new Map());
    }
    const dict = this.dictionaries.get(locale)!;
    for (const [k, v] of Object.entries(entries)) {
      dict.set(k, v);
    }
  }

  /**
   * Translates a string key with parameter interpolation and English fallback.
   */
  public t(
    key: string,
    params: Record<string, string | number> = {},
    targetLocale: LocaleCode = this.currentLocale
  ): string {
    const targetDict = this.dictionaries.get(targetLocale);
    let template = targetDict?.get(key);

    // Fallback to EN_US if missing in target locale
    if (!template && targetLocale !== 'EN_US') {
      const enDict = this.dictionaries.get('EN_US');
      template = enDict?.get(key);
    }

    // Ultimate fallback to raw key
    if (!template) {
      return key;
    }

    // Interpolate {{paramName}}
    let result = template;
    for (const [paramKey, paramValue] of Object.entries(params)) {
      const regex = new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g');
      result = result.replace(regex, String(paramValue));
    }

    return result;
  }

  /**
   * Resolves pluralized translation strings.
   */
  public pluralize(
    count: number,
    options: { zero?: string; one: string; other: string },
    params: Record<string, string | number> = {},
    targetLocale: LocaleCode = this.currentLocale
  ): string {
    let chosenKey: string;
    if (count === 0 && options.zero) {
      chosenKey = options.zero;
    } else if (count === 1) {
      chosenKey = options.one;
    } else {
      chosenKey = options.other;
    }

    return this.t(chosenKey, { ...params, count }, targetLocale);
  }

  /**
   * Audits locale coverage percentage compared to reference English dictionary.
   */
  public auditCoverage(targetLocale: LocaleCode): {
    locale: LocaleCode;
    totalKeys: number;
    translatedKeys: number;
    missingKeys: string[];
    coveragePercent: number;
  } {
    const enDict = this.dictionaries.get('EN_US') || new Map();
    const targetDict = this.dictionaries.get(targetLocale) || new Map();

    const totalKeys = enDict.size;
    const missingKeys: string[] = [];
    let translatedKeys = 0;

    for (const key of enDict.keys()) {
      if (targetDict.has(key)) {
        translatedKeys++;
      } else {
        missingKeys.push(key);
      }
    }

    const coveragePercent = totalKeys > 0 ? Number(((translatedKeys / totalKeys) * 100).toFixed(1)) : 100;

    return {
      locale: targetLocale,
      totalKeys,
      translatedKeys,
      missingKeys,
      coveragePercent,
    };
  }
}
