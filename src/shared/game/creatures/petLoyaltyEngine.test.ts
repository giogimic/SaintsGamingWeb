import { describe, it, expect } from 'vitest';
import {
  createPetState,
  getPetMood,
  feedPet,
  interactWithPet,
  decayPetNeeds,
} from './petLoyaltyEngine';

describe('Pet Loyalty, Hunger & Interaction Lifecycle Engine (Bible 23)', () => {
  it('initializes pet state and determines joyful mood at high stats', () => {
    const pet = createPetState('pet_1', 'Buddy', 'FISH');
    expect(pet.hunger).toBe(80);
    expect(pet.happiness).toBe(80);
    expect(getPetMood(pet)).toBe('JOYFUL');
  });

  it('feeds favorite food with enhanced happiness and triggers trick unlock', () => {
    const pet = createPetState('pet_1', 'Buddy', 'FISH');
    pet.hunger = 50;
    pet.happiness = 50;
    pet.loyaltyXp = 80;

    // Feed favorite food (FISH) -> grants 50 loyalty XP, pushing from 80 to 130 (>100 threshold for TRICK_SIT)
    const result = feedPet(pet, 'FISH', 30);

    expect(result.isFavoriteFood).toBe(true);
    expect(result.hungerGained).toBe(30);
    expect(pet.loyaltyXp).toBe(130);
    expect(result.newUnlockedTricks).toContain('TRICK_SIT');
    expect(pet.unlockedTricks).toContain('TRICK_SIT');
  });

  it('interacts through play and applies time-based hunger/happiness decay', () => {
    const pet = createPetState('pet_1', 'Buddy', 'BERRIES');

    // Playing with pet
    const play = interactWithPet(pet, 'PLAY');
    expect(play.happinessGained).toBe(20);
    expect(play.loyaltyGained).toBe(30);

    // Decay needs after 12 hours (12 * 5 = -60 hunger, 12 * 3 = -36 happiness)
    const mood = decayPetNeeds(pet, 12);
    expect(pet.hunger).toBeLessThanOrEqual(40);
    expect(mood).toBe('HUNGRY');
  });
});
