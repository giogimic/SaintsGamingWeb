import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inspectQuaterniusAnimationBank } from './quaterniusAnimationMetadata';

describe('Quaternius animation bank metadata', () => {
  it('categorizes the embedded clip names without treating "Standard" as an idle cue', async () => {
    const bankPath = path.resolve(process.cwd(), 'public/models/quaternius/ual1_standard.glb');
    const presentation = await inspectQuaterniusAnimationBank(bankPath);
    const clips = new Map(presentation.categorizedAnimations.map((clip) => [clip.clipName, clip]));

    expect(clips.get('Death01')?.category).toBe('Reactions');
    expect(clips.get('Death01')?.suggestedSlots).toContain('death');
    expect(clips.get('Death01')?.suggestedSlots).not.toContain('idle');
    expect(clips.get('Sword_Attack')?.category).toBe('Combat');
    expect(clips.get('Sword_Attack')?.suggestedSlots).toContain('attack_light');
    expect(clips.get('A_TPose')?.category).toBe('Special');
    expect(clips.get('Idle_Loop')?.category).toBe('Locomotion');
  });
});
