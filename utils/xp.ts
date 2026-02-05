const XP_PER_LEVEL = 100;

export type HabitDifficulty = 'easy' | 'medium' | 'hard';

/** Returns true if a timed boost is still active (not expired). */
export function isBoostActive(until: string | null | undefined): boolean {
  return !!until && new Date(until) > new Date();
}

export function getXPForDifficulty(difficulty: HabitDifficulty): number {
  switch (difficulty) {
    case 'easy': return 5;
    case 'medium': return 10;
    case 'hard': return 20;
  }
}

export function xpRequiredForLevel(_level: number): number {
  return XP_PER_LEVEL;
}

export function calculateStreakMultiplier(streak: number): number {
  if (streak >= 30) return 3;
  if (streak >= 7) return 2;
  return 1;
}

export function calculateComboMultiplier(comboCount: number): number {
  if (comboCount >= 4) return 1.15;
  if (comboCount === 3) return 1.10;
  if (comboCount === 2) return 1.05;
  return 1;
}

export function calculateXPGain(
  baseXP: number,
  streak: number,
  hasBooster: boolean = false,
  comboCount: number = 0,
): number {
  const streakBase = baseXP * calculateStreakMultiplier(streak);
  const comboApplied = streakBase * calculateComboMultiplier(comboCount);
  const boosterApplied = hasBooster ? comboApplied * 1.2 : comboApplied;
  return Math.floor(boosterApplied);
}

export function checkLevelUp(currentXP: number, level: number): { newLevel: number; remainingXP: number } {
  let xpNeeded = xpRequiredForLevel(level);
  let newLevel = level;
  let remainingXP = currentXP;

  while (remainingXP >= xpNeeded) {
    remainingXP -= xpNeeded;
    newLevel++;
    xpNeeded = xpRequiredForLevel(newLevel);
  }

  return { newLevel, remainingXP };
}

export function xpProgressPercent(currentXP: number, level: number): number {
  const needed = xpRequiredForLevel(level);
  return Math.min((currentXP / needed) * 100, 100);
}
