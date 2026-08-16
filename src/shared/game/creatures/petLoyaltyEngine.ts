/**
 * Saints Gaming — Pet Loyalty, Hunger & Interaction Lifecycle Engine (Bible 23)
 * Manages pet hunger decay, happiness metrics, favorite food preferences, and loyalty trick unlocks.
 */

export type FoodCategory = 'BERRIES' | 'FISH' | 'MEAT' | 'SWEETS';

export type PetMood = 'JOYFUL' | 'CONTENT' | 'HUNGRY' | 'LONELY' | 'NEGLECTED';

export type PetTrick = 'TRICK_SIT' | 'TRICK_DANCE' | 'TRICK_CHEER' | 'TRICK_SNIFF';

export interface PetState {
  petId: string;
  name: string;
  hunger: number; // 0 (starving) to 100 (full)
  happiness: number; // 0 (miserable) to 100 (ecstatic)
  loyaltyXp: number;
  unlockedTricks: PetTrick[];
  favoriteFood: FoodCategory;
}

export const LOYALTY_TRICK_THRESHOLDS: Array<{ trick: PetTrick; minXp: number }> = [
  { trick: 'TRICK_SIT', minXp: 100 },
  { trick: 'TRICK_DANCE', minXp: 300 },
  { trick: 'TRICK_CHEER', minXp: 600 },
  { trick: 'TRICK_SNIFF', minXp: 1000 },
];

/**
 * Initializes a new pet state.
 */
export function createPetState(
  petId: string,
  name: string,
  favoriteFood: FoodCategory = 'BERRIES'
): PetState {
  return {
    petId,
    name,
    hunger: 80,
    happiness: 80,
    loyaltyXp: 0,
    unlockedTricks: [],
    favoriteFood,
  };
}

/**
 * Evaluates the pet's current mood based on hunger and happiness.
 */
export function getPetMood(pet: PetState): PetMood {
  if (pet.hunger < 20 && pet.happiness < 20) return 'NEGLECTED';
  if (pet.hunger < 35) return 'HUNGRY';
  if (pet.happiness < 35) return 'LONELY';
  if (pet.happiness >= 80 && pet.hunger >= 70) return 'JOYFUL';
  return 'CONTENT';
}

/**
 * Feeds a pet food, granting hunger restoration and happiness boosts.
 */
export function feedPet(
  pet: PetState,
  foodCategory: FoodCategory,
  nutritionValue: number = 25
): {
  hungerGained: number;
  happinessGained: number;
  isFavoriteFood: boolean;
  newUnlockedTricks: PetTrick[];
} {
  const isFavorite = foodCategory === pet.favoriteFood;
  const hungerGain = Math.min(100 - pet.hunger, nutritionValue);
  const happinessGain = Math.min(100 - pet.happiness, isFavorite ? nutritionValue * 1.5 : nutritionValue * 0.75);

  pet.hunger = Math.min(100, pet.hunger + hungerGain);
  pet.happiness = Math.min(100, pet.happiness + happinessGain);

  const xpGained = isFavorite ? 50 : 25;
  pet.loyaltyXp += xpGained;

  const newUnlockedTricks: PetTrick[] = [];
  for (const t of LOYALTY_TRICK_THRESHOLDS) {
    if (pet.loyaltyXp >= t.minXp && !pet.unlockedTricks.includes(t.trick)) {
      pet.unlockedTricks.push(t.trick);
      newUnlockedTricks.push(t.trick);
    }
  }

  return {
    hungerGained: hungerGain,
    happinessGained: happinessGain,
    isFavoriteFood: isFavorite,
    newUnlockedTricks,
  };
}

/**
 * Interacts with pet (Petting or Playing).
 */
export function interactWithPet(
  pet: PetState,
  type: 'PET' | 'PLAY'
): { happinessGained: number; loyaltyGained: number; newUnlockedTricks: PetTrick[] } {
  const happinessGain = type === 'PLAY' ? 20 : 10;
  const loyaltyGain = type === 'PLAY' ? 30 : 15;

  pet.happiness = Math.min(100, pet.happiness + happinessGain);
  pet.loyaltyXp += loyaltyGain;

  const newUnlockedTricks: PetTrick[] = [];
  for (const t of LOYALTY_TRICK_THRESHOLDS) {
    if (pet.loyaltyXp >= t.minXp && !pet.unlockedTricks.includes(t.trick)) {
      pet.unlockedTricks.push(t.trick);
      newUnlockedTricks.push(t.trick);
    }
  }

  return { happinessGained: happinessGain, loyaltyGained: loyaltyGain, newUnlockedTricks };
}

/**
 * Applies time-based needs decay.
 */
export function decayPetNeeds(pet: PetState, elapsedHours: number): PetMood {
  const hungerDecay = elapsedHours * 5; // -5 hunger per hour
  const happinessDecay = elapsedHours * 3; // -3 happiness per hour

  pet.hunger = Math.max(0, pet.hunger - hungerDecay);
  pet.happiness = Math.max(0, pet.happiness - happinessDecay);

  return getPetMood(pet);
}
