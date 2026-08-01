/** Pure helpers for the FiveM bridge (safe to unit-test without Prisma). */

/** Normalize license identifiers (strip license: prefix, lowercase). */
export function normalizeFivemLicense(license: string): string {
  return license.trim().replace(/^license:/i, "").toLowerCase();
}

export function applyBankDelta(
  currentBank: number,
  currentCash: number,
  type: string,
  amount: number
): { bank: number; cash: number } {
  const abs = Math.abs(Math.trunc(amount));
  switch (type.toUpperCase()) {
    case "DEPOSIT":
      return {
        cash: Math.max(0, currentCash - abs),
        bank: currentBank + abs,
      };
    case "WITHDRAWAL":
      return {
        cash: currentCash + abs,
        bank: Math.max(0, currentBank - abs),
      };
    case "WIRE_TRANSFER":
    case "SALARY":
    case "ADJUST":
      return { cash: currentCash, bank: Math.max(0, currentBank + Math.trunc(amount)) };
    default:
      return { cash: currentCash, bank: Math.max(0, currentBank + Math.trunc(amount)) };
  }
}
