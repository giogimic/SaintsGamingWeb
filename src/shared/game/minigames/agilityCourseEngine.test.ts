import { describe, it, expect } from 'vitest';
import {
  startAgilityLap,
  attemptObstacle,
} from './agilityCourseEngine';

describe('Agility Rooftop Obstacle Course & Graceful Engine (Bible 08)', () => {
  it('starts a lap and blocks when agility level is insufficient', () => {
    // Attempt Seers course (requires 60) with level 30
    const lowLevel = startAgilityLap('course_seers_rooftop', 30);
    expect(lowLevel.success).toBe(false);
    expect(lowLevel.reason).toContain('Requires Agility level 60');

    // Valid start on Draynor course
    const valid = startAgilityLap('course_draynor_rooftop', 15);
    expect(valid.success).toBe(true);
    expect(valid.state?.courseId).toBe('course_draynor_rooftop');
    expect(valid.state?.currentObstacleIndex).toBe(0);
  });

  it('handles obstacle fails with damage', () => {
    const lap = startAgilityLap('course_draynor_rooftop', 10);
    expect(lap.success).toBe(true);
    const state = lap.state!;

    // Pass obstacle 0 (Rough Wall)
    attemptObstacle(state, 10, 0.1);
    expect(state.currentObstacleIndex).toBe(1);

    // Fail obstacle 1 (Tightrope) with high roll 0.99
    const fail = attemptObstacle(state, 10, 0.99);
    expect(fail.success).toBe(false);
    expect(fail.failDamageTaken).toBe(2);
    expect(fail.reason).toContain('You slip and take damage!');
  });

  it('completes entire lap, grants course bonus XP, and awards Marks of Grace', () => {
    const lap = startAgilityLap('course_draynor_rooftop', 30);
    const state = lap.state!;

    // 5 obstacles in Draynor course
    attemptObstacle(state, 30, 0.1); // 0
    attemptObstacle(state, 30, 0.1); // 1
    attemptObstacle(state, 30, 0.1); // 2
    attemptObstacle(state, 30, 0.1); // 3

    // Final obstacle (4) with low mark roll (0.1 < 0.35 chance)
    const finalObstacle = attemptObstacle(state, 30, 0.1, 0.1);
    expect(finalObstacle.success).toBe(true);
    expect(finalObstacle.lapCompleted).toBe(true);
    expect(finalObstacle.spawnedMarkOfGrace).toBe(true);
    expect(finalObstacle.xpAwarded).toBe(11 + 79); // Obstacle XP 11 + Course bonus 79
    expect(state.isLapFinished).toBe(true);
    expect(state.marksOfGraceCollected).toBe(1);
  });
});
