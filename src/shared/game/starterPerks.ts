/** Map Studio-managed perk slugs onto the stable gameplay effect identifiers. */
export function getStarterPerkEffectId(slug: string | null | undefined): string {
  const normalized = (slug || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return normalized === 'MASTER_SAINT' ? 'MASTER_TAMER' : normalized;
}
