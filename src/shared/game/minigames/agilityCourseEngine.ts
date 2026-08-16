/**
 * Saints Gaming — Agility Rooftop Obstacle Course & Graceful Engine (Bible 08)
 * Evaluates agility rooftop courses, obstacle pass/fail rolls, lap timers, and Marks of Grace currency drops.
 */

export interface AgilityObstacle {
  id: string;
  name: string;
  reqAgilityLevel: number;
  xpAwarded: number;
  baseSuccessRate: number; // 0.0 to 1.0
  failDamage?: number;
}

export interface AgilityCourseDefinition {
  id: string;
  name: string;
  reqAgilityLevel: number;
  totalCourseXpBonus: number;
  obstacles: AgilityObstacle[];
  markOfGraceChance: number; // e.g. 1/3 = 0.33 per lap
}

export const CANONICAL_COURSES: Record<string, AgilityCourseDefinition> = {
  course_gnome_stronghold: {
    id: 'course_gnome_stronghold',
    name: 'Gnome Stronghold Agility Course',
    reqAgilityLevel: 1,
    totalCourseXpBonus: 39,
    obstacles: [
      { id: 'gnome_log_balance', name: 'Log Balance', reqAgilityLevel: 1, xpAwarded: 7.5, baseSuccessRate: 1.0 },
      { id: 'gnome_obstacle_net', name: 'Obstacle Net', reqAgilityLevel: 1, xpAwarded: 7.5, baseSuccessRate: 1.0 },
      { id: 'gnome_tree_branch', name: 'Tree Branch', reqAgilityLevel: 1, xpAwarded: 5, baseSuccessRate: 1.0 },
      { id: 'gnome_balancing_rope', name: 'Balancing Rope', reqAgilityLevel: 1, xpAwarded: 7.5, baseSuccessRate: 1.0 },
      { id: 'gnome_tree_descend', name: 'Tree Branch Descend', reqAgilityLevel: 1, xpAwarded: 5, baseSuccessRate: 1.0 },
      { id: 'gnome_pipe_squeeze', name: 'Obstacle Pipe', reqAgilityLevel: 1, xpAwarded: 7.5, baseSuccessRate: 1.0 },
    ],
    markOfGraceChance: 0.0,
  },
  course_draynor_rooftop: {
    id: 'course_draynor_rooftop',
    name: 'Draynor Village Rooftop Course',
    reqAgilityLevel: 10,
    totalCourseXpBonus: 79,
    obstacles: [
      { id: 'draynor_rough_wall', name: 'Rough Wall', reqAgilityLevel: 10, xpAwarded: 5, baseSuccessRate: 0.9 },
      { id: 'draynor_tightrope_1', name: 'Tightrope', reqAgilityLevel: 10, xpAwarded: 8, baseSuccessRate: 0.85, failDamage: 2 },
      { id: 'draynor_tightrope_2', name: 'Tightrope 2', reqAgilityLevel: 10, xpAwarded: 7, baseSuccessRate: 0.85, failDamage: 2 },
      { id: 'draynor_narrow_wall', name: 'Narrow Wall', reqAgilityLevel: 10, xpAwarded: 10, baseSuccessRate: 0.9 },
      { id: 'draynor_gap_jump', name: 'Wall Jump', reqAgilityLevel: 10, xpAwarded: 11, baseSuccessRate: 0.85, failDamage: 3 },
    ],
    markOfGraceChance: 0.35,
  },
  course_varrock_rooftop: {
    id: 'course_varrock_rooftop',
    name: 'Varrock Rooftop Course',
    reqAgilityLevel: 30,
    totalCourseXpBonus: 125,
    obstacles: [
      { id: 'varrock_rough_wall', name: 'Rough Wall Climb', reqAgilityLevel: 30, xpAwarded: 12, baseSuccessRate: 0.9 },
      { id: 'varrock_clothes_line', name: 'Clothes Line', reqAgilityLevel: 30, xpAwarded: 21, baseSuccessRate: 0.85, failDamage: 3 },
      { id: 'varrock_gap_jump_1', name: 'Rooftop Gap', reqAgilityLevel: 30, xpAwarded: 17, baseSuccessRate: 0.85, failDamage: 4 },
      { id: 'varrock_wall_balance', name: 'Wall Balance', reqAgilityLevel: 30, xpAwarded: 25, baseSuccessRate: 0.9 },
      { id: 'varrock_gap_jump_2', name: 'Leap Down', reqAgilityLevel: 30, xpAwarded: 9, baseSuccessRate: 1.0 },
    ],
    markOfGraceChance: 0.4,
  },
  course_seers_rooftop: {
    id: 'course_seers_rooftop',
    name: "Seers' Village Rooftop Course",
    reqAgilityLevel: 60,
    totalCourseXpBonus: 435,
    obstacles: [
      { id: 'seers_bank_wall', name: 'Bank Wall Climb', reqAgilityLevel: 60, xpAwarded: 45, baseSuccessRate: 0.9 },
      { id: 'seers_gap_jump', name: 'Rooftop Leap', reqAgilityLevel: 60, xpAwarded: 20, baseSuccessRate: 0.85, failDamage: 5 },
      { id: 'seers_tightrope', name: 'Tightrope', reqAgilityLevel: 60, xpAwarded: 20, baseSuccessRate: 0.85, failDamage: 5 },
      { id: 'seers_jump_down', name: 'Jump Down', reqAgilityLevel: 60, xpAwarded: 25, baseSuccessRate: 1.0 },
    ],
    markOfGraceChance: 0.45,
  },
};

export interface AgilityRunnerState {
  courseId: string;
  currentObstacleIndex: number;
  lapStartTimeMs: number;
  marksOfGraceCollected: number;
  isLapFinished: boolean;
}

/**
 * Starts an agility course lap.
 */
export function startAgilityLap(
  courseId: string,
  playerAgilityLevel: number
): { success: boolean; state?: AgilityRunnerState; reason?: string } {
  const course = CANONICAL_COURSES[courseId];
  if (!course) {
    return { success: false, reason: 'Unknown agility course.' };
  }

  if (playerAgilityLevel < course.reqAgilityLevel) {
    return {
      success: false,
      reason: `Requires Agility level ${course.reqAgilityLevel} (Current: ${playerAgilityLevel})`,
    };
  }

  return {
    success: true,
    state: {
      courseId,
      currentObstacleIndex: 0,
      lapStartTimeMs: Date.now(),
      marksOfGraceCollected: 0,
      isLapFinished: false,
    },
  };
}

/**
 * Attempts to traverse the current obstacle in the agility course.
 */
export function attemptObstacle(
  state: AgilityRunnerState,
  playerAgilityLevel: number,
  randomSuccessRoll: number = Math.random(),
  randomMarkRoll: number = Math.random()
): {
  success: boolean;
  xpAwarded: number;
  failDamageTaken: number;
  lapCompleted: boolean;
  spawnedMarkOfGrace: boolean;
  reason?: string;
} {
  const course = CANONICAL_COURSES[state.courseId];
  if (!course || state.isLapFinished) {
    return { success: false, xpAwarded: 0, failDamageTaken: 0, lapCompleted: false, spawnedMarkOfGrace: false };
  }

  const obstacle = course.obstacles[state.currentObstacleIndex];
  if (!obstacle) {
    return { success: false, xpAwarded: 0, failDamageTaken: 0, lapCompleted: false, spawnedMarkOfGrace: false };
  }

  // Calculate success probability with level scaling bonus
  const levelDelta = playerAgilityLevel - obstacle.reqAgilityLevel;
  const successChance = Math.min(0.99, obstacle.baseSuccessRate + levelDelta * 0.005);

  if (randomSuccessRoll > successChance) {
    const damage = obstacle.failDamage ?? 1;
    return {
      success: false,
      xpAwarded: 0,
      failDamageTaken: damage,
      lapCompleted: false,
      spawnedMarkOfGrace: false,
      reason: 'You slip and take damage!',
    };
  }

  // Passed obstacle!
  let xp = obstacle.xpAwarded;
  state.currentObstacleIndex += 1;

  let lapCompleted = false;
  let spawnedMark = false;

  // Check if course lap is completed
  if (state.currentObstacleIndex >= course.obstacles.length) {
    state.isLapFinished = true;
    lapCompleted = true;
    xp += course.totalCourseXpBonus;

    // Roll for Mark of Grace on lap completion
    if (randomMarkRoll < course.markOfGraceChance) {
      spawnedMark = true;
      state.marksOfGraceCollected += 1;
    }
  }

  return {
    success: true,
    xpAwarded: xp,
    failDamageTaken: 0,
    lapCompleted,
    spawnedMarkOfGrace: spawnedMark,
  };
}
