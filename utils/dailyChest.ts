export interface DailyChestReward {
  type: 'xp' | 'streakFreeze' | 'xpBooster';
  amount: number;
  label: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare';
}

interface WeightedReward extends DailyChestReward {
  weight: number;
}

const CHEST_REWARDS: WeightedReward[] = [
  { type: 'xp', amount: 50, label: '+50 XP', icon: '💰', rarity: 'common', weight: 50 },
  { type: 'xp', amount: 100, label: '+100 XP', icon: '💎', rarity: 'uncommon', weight: 30 },
  { type: 'xp', amount: 200, label: '+200 XP', icon: '🌟', rarity: 'rare', weight: 8 },
  { type: 'streakFreeze', amount: 1, label: 'Seri Koruyucu x1', icon: '🛡️', rarity: 'rare', weight: 7 },
  { type: 'xpBooster', amount: 1, label: 'XP Booster (1 saat)', icon: '⚡', rarity: 'rare', weight: 5 },
];

const LUCKY_CHEST_REWARDS: WeightedReward[] = [
  { type: 'xp', amount: 50, label: '+50 XP', icon: '💰', rarity: 'common', weight: 30 },
  { type: 'xp', amount: 100, label: '+100 XP', icon: '💎', rarity: 'uncommon', weight: 40 },
  { type: 'xp', amount: 200, label: '+200 XP', icon: '🌟', rarity: 'rare', weight: 13 },
  { type: 'streakFreeze', amount: 1, label: 'Seri Koruyucu x1', icon: '🛡️', rarity: 'rare', weight: 10 },
  { type: 'xpBooster', amount: 1, label: 'XP Booster (1 saat)', icon: '⚡', rarity: 'rare', weight: 7 },
];

export function rollDailyChest(hasLuckBoost: boolean = false): DailyChestReward {
  const rewards = hasLuckBoost ? LUCKY_CHEST_REWARDS : CHEST_REWARDS;
  const totalWeight = rewards.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const reward of rewards) {
    roll -= reward.weight;
    if (roll <= 0) {
      const { weight: _, ...result } = reward;
      return result;
    }
  }

  // Fallback
  const { weight: _, ...fallback } = rewards[0];
  return fallback;
}

export function getRarityColor(rarity: DailyChestReward['rarity']): string {
  switch (rarity) {
    case 'common': return '#8e8e93';
    case 'uncommon': return '#34c759';
    case 'rare': return '#ff9f0a';
  }
}

export function getRarityLabel(rarity: DailyChestReward['rarity']): string {
  switch (rarity) {
    case 'common': return 'Yaygin';
    case 'uncommon': return 'Nadir';
    case 'rare': return 'Efsanevi';
  }
}
