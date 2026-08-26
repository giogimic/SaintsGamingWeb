/**
 * Saints Gaming — Content Package & Modularity Engine (Studio Plan Part 8 §5 & §6)
 *
 * Implements exportable/importable content package manifests with dependency validation,
 * namespace resolution, and missing dependency detection.
 */

import { DefinitionRef, DefinitionType } from '../definitionRegistry';

export interface PackageManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  /** Dependencies required by this package (e.g. other packages or specific slugs). */
  dependencies: {
    type: DefinitionType;
    slug: string;
    packageId?: string;
  }[];
  /** Content payload contained in this package. */
  contents: {
    type: DefinitionType;
    slug: string;
    name: string;
    data: Record<string, any>;
  }[];
  createdAt: string;
}

export interface PackageValidationResult {
  valid: boolean;
  missingDependencies: {
    type: DefinitionType;
    slug: string;
  }[];
  contentCount: number;
  warnings: string[];
}

/**
 * Creates a valid PackageManifest bundle from a set of definitions.
 */
export function createContentPackage(
  id: string,
  name: string,
  version: string,
  contents: PackageManifest['contents'],
  dependencies: PackageManifest['dependencies'] = [],
  description?: string,
  author?: string
): PackageManifest {
  return {
    id: id.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
    name,
    version,
    description,
    author,
    dependencies,
    contents,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Validates whether all dependencies declared in a PackageManifest exist within known slugs.
 */
export function validatePackageDependencies(
  pkg: PackageManifest,
  knownSlugsByType: Map<DefinitionType, Set<string>>
): PackageValidationResult {
  const missing: { type: DefinitionType; slug: string }[] = [];
  const warnings: string[] = [];

  for (const dep of pkg.dependencies) {
    const knownSet = knownSlugsByType.get(dep.type);
    if (!knownSet || !knownSet.has(dep.slug)) {
      // Check if the dependency is provided internally by this same package
      const isInternal = pkg.contents.some((c) => c.type === dep.type && c.slug === dep.slug);
      if (!isInternal) {
        missing.push({ type: dep.type, slug: dep.slug });
      }
    }
  }

  if (pkg.contents.length === 0) {
    warnings.push(`Package "${pkg.id}" contains no content definitions.`);
  }

  return {
    valid: missing.length === 0,
    missingDependencies: missing,
    contentCount: pkg.contents.length,
    warnings,
  };
}

/**
 * Serializes a PackageManifest into formatted JSON.
 */
export function exportPackageToJson(pkg: PackageManifest): string {
  return JSON.stringify(pkg, null, 2);
}

/**
 * Parses and verifies basic schema structure of a raw JSON package bundle.
 */
export function importPackageFromJson(rawJson: string): {
  success: boolean;
  package?: PackageManifest;
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed.id || !parsed.name || !parsed.version || !Array.isArray(parsed.contents)) {
      return { success: false, error: 'Invalid package manifest format: missing id, name, version, or contents array.' };
    }
    return {
      success: true,
      package: {
        id: String(parsed.id),
        name: String(parsed.name),
        version: String(parsed.version),
        description: parsed.description ? String(parsed.description) : undefined,
        author: parsed.author ? String(parsed.author) : undefined,
        dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
        contents: parsed.contents,
        createdAt: parsed.createdAt || new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return { success: false, error: `JSON parse error: ${err.message}` };
  }
}
