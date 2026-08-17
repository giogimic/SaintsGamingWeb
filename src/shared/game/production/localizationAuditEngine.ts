/**
 * Saints Gaming — Studio Localization & Audit Logging Engine (Bible 27 §3.11 & §3.12)
 * Provides centralized string localization dictionaries and structured mutation audit logging.
 */

import { ResourceRef } from './taskEngine';

export interface LocaleString {
  key: string;
  locale: string;
  value: string;
  projectId?: string | null;
  updatedAt: string;
  updatedBy?: string;
}

export interface StudioAuditLog {
  id: string;
  at: string;
  userId: string;
  projectId?: string;
  action: string;
  resource: ResourceRef;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
}

export class StudioLocalizationEngine {
  private dictionary: Map<string, Map<string, string>> = new Map(); // locale -> (key -> value)
  private defaultLocale: string = 'en';

  constructor(defaultLocale: string = 'en') {
    this.defaultLocale = defaultLocale;
  }

  setTranslation(locale: string, key: string, value: string): void {
    const loc = locale.toLowerCase();
    if (!this.dictionary.has(loc)) {
      this.dictionary.set(loc, new Map());
    }
    this.dictionary.get(loc)!.set(key, value);
  }

  translate(key: string, locale: string = this.defaultLocale, fallbackValue?: string): string {
    const loc = locale.toLowerCase();
    const primary = this.dictionary.get(loc)?.get(key);
    if (primary !== undefined) return primary;

    const fallback = this.dictionary.get(this.defaultLocale.toLowerCase())?.get(key);
    if (fallback !== undefined) return fallback;

    return fallbackValue ?? key;
  }
}

/**
 * Creates a structured audit log entry for any mutating Studio operation.
 */
export function createStudioAuditLog(params: {
  userId: string;
  projectId?: string;
  action: string;
  resource: ResourceRef;
  before?: unknown;
  after?: unknown;
  meta?: Record<string, unknown>;
}): StudioAuditLog {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    at: new Date().toISOString(),
    userId: params.userId,
    projectId: params.projectId,
    action: params.action,
    resource: params.resource,
    before: params.before,
    after: params.after,
    meta: params.meta,
  };
}
