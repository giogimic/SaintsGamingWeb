/**
 * Helper functions to fetch SA-MP assets from Open.mp public CDN.
 * This avoids storing hundreds of megabytes of images in the repo.
 */

export function getSampSkinUrl(skinId: number): string {
  // SA-MP skins range from 0 to 311 (some gaps exist)
  if (skinId < 0 || skinId > 311) {
    return 'https://assets.open.mp/skins/0.png'; // default fallback (CJ)
  }
  return `https://assets.open.mp/skins/${skinId}.png`;
}

export function getSampVehicleUrl(vehicleId: number): string {
  // SA-MP vehicle IDs range from 400 to 611
  if (vehicleId < 400 || vehicleId > 611) {
    return 'https://assets.open.mp/vehicles/400.png'; // default fallback (Landstalker)
  }
  return `https://assets.open.mp/vehicles/${vehicleId}.png`;
}

export function getSampWeaponUrl(weaponId: number): string {
  // SA-MP weapon IDs range from 0 to 46
  if (weaponId < 0 || weaponId > 46) {
    return 'https://assets.open.mp/weapons/0.png'; // default fallback (Fist)
  }
  return `https://assets.open.mp/weapons/${weaponId}.png`;
}
