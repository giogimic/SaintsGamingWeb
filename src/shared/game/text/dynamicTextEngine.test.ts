import { describe, it, expect } from 'vitest';
import {
  interpolateText,
  evaluateConditionalText,
  formatNarrativeText,
} from './dynamicTextEngine';

describe('dynamicTextEngine (Studio Plan Part 8 §8)', () => {
  it('interpolates basic player variables', () => {
    const template = 'Welcome to the Lobby, {playerName}! You have {gold} gold.';
    const result = interpolateText(template, {
      playerName: 'HeroSaint',
      gold: 5000,
    });
    expect(result).toBe('Welcome to the Lobby, HeroSaint! You have 5,000 gold.');
  });

  it('uses default fallback when variable is missing', () => {
    const template = 'Hello {playerName:traveler}, your level is {level:1}.';
    const result = interpolateText(template, {});
    expect(result).toBe('Hello traveler, your level is 1.');
  });

  it('leaves unrecognized variables intact when no fallback provided', () => {
    const template = 'Requires {unknownVar}.';
    const result = interpolateText(template, {});
    expect(result).toBe('Requires {unknownVar}.');
  });

  it('handles escaped braces', () => {
    const template = 'Literal \\{notAVar\\} and {playerName}.';
    const result = interpolateText(template, { playerName: 'Saint' });
    expect(result).toBe('Literal {notAVar} and Saint.');
  });

  it('evaluates conditional text blocks', () => {
    const template = '[if hasCompletedQuest]Thank you for saving the town![else]Please help us defeat the beast.[endif]';
    expect(evaluateConditionalText(template, { hasCompletedQuest: true })).toBe('Thank you for saving the town!');
    expect(evaluateConditionalText(template, { hasCompletedQuest: false })).toBe('Please help us defeat the beast.');
  });

  it('formats full narrative with conditionals and variables', () => {
    const template = '[if isNight]Beware the shadows, {playerName}![else]Good morning, {playerName}! Safe travels to {target}.[endif]';
    const resultDay = formatNarrativeText(template, {
      isNight: false,
      playerName: 'Aiden',
      target: 'Copper Peak',
    });
    expect(resultDay).toBe('Good morning, Aiden! Safe travels to Copper Peak.');

    const resultNight = formatNarrativeText(template, {
      isNight: true,
      playerName: 'Aiden',
    });
    expect(resultNight).toBe('Beware the shadows, Aiden!');
  });
});
