export const ALL_DAYS: number[] = [0, 1, 2, 3, 4, 5, 6];

export type HabitDifficulty = 'easy' | 'medium' | 'hard';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  target: number;
  current: number;
  unit: string;
  increment: number;
  xpReward: number;
  difficulty: HabitDifficulty;
  streak: number;
  completedToday: boolean;
  /** Scheduled weekdays: 0=Pazar, 1=Pazartesi ... 6=Cumartesi */
  scheduleDays: number[];
  /** Per-habit reminder toggle */
  reminderEnabled?: boolean;
  /** Per-habit reminder time */
  reminderTime?: { hour: number; minute: number };
  /** Scheduled notification IDs (managed by the system) */
  notificationIds?: string[];
  /** Habit seviyesi (başlangıç 1) */
  level: number;
  /** Habit içi XP */
  habitXp: number;
  /** Sonraki seviyeye geçmek için gereken XP */
  xpToNextLevel: number;
  /** Sort index — lower = higher in list */
  order: number;
  /** Archived habits are hidden from Home */
  isArchived?: boolean;
}

export interface Inventory {
  avatars: string[];
  themes: string[];
  boosters: number;
  streakFreezes: number;
  titles: string[];
  specialBadges: string[];
  badgeFrames: string[];
  levelAuras: string[];
  aiInsightsPacks: number;
  mysteryBoxesOpened: number;
}

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface ActiveEffects {
  xpBoosterUntil: string | null;
  doubleXpUntil: string | null;
  focusModeUntil: string | null;
  chestLuckUntil: string | null;
  comboBoostUntil: string | null;
}

/** Badge upgrade tracking: badgeId -> current tier */
export type BadgeUpgrades = Record<string, BadgeTier>;

export interface UserProfile {
  name: string;
  avatar: string;
  level: number;
  currentXP: number;
  totalXP: number;
  xpBalance: number;
  badges: string[];
  inventory: Inventory;
  activeEffects: ActiveEffects;
  activeTitle: string | null;
  /** Avatars automatically unlocked by reaching level milestones */
  levelUnlockedAvatars: string[];
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  badgeUpgrades?: BadgeUpgrades;
}

export type ShopItemType =
  | 'avatar' | 'theme' | 'streakFreeze' | 'xpBooster' | 'title' | 'specialBadge'
  | 'doubleXp' | 'focusMode' | 'badgeFrame' | 'levelAura'
  | 'aiInsights' | 'mysteryBox' | 'badgeUpgrade'
  | 'chestLuck' | 'comboBoost';
export type ShopCategory = 'powerups' | 'cosmetics' | 'aiinsights' | 'mystery' | 'badges';

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  type: ShopItemType;
  category: ShopCategory;
  description: string;
  /** Human-readable effect text */
  effect?: string;
  /** Duration label for timed boosts */
  duration?: string;
  /** For badge upgrades: target tier */
  upgradeTier?: BadgeTier;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  weeklyXp: number;
  monthlyXp: number;
  streak: number;
  isFriend?: boolean;
}

// Her gün için hangi habit tamamlandı bilgisi
export interface DailyHabitLog {
  completed: boolean;
  xpEarned: number;
  /** Günlük ilerleme değeri (ör: 2.5 / 3 L su) */
  value: number;
}

// YYYY-MM-DD -> { [habitId]: DailyHabitLog }
export type DailyLogs = Record<string, Record<string, DailyHabitLog>>;

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: string;
  unlocked: boolean;
}

export const DEFAULT_HABITS: Habit[] = [
  {
    id: 'water',
    name: 'Su İç',
    icon: '💧',
    target: 3,
    current: 0,
    unit: 'L',
    increment: 0.25,
    xpReward: 10,
    difficulty: 'medium',
    streak: 0,
    completedToday: false,
    scheduleDays: ALL_DAYS,
    reminderEnabled: true,
    reminderTime: { hour: 9, minute: 0 },
    level: 1,
    habitXp: 0,
    xpToNextLevel: 100,
    order: 0,
  },
  {
    id: 'walk',
    name: 'Yürüyüş',
    icon: '🚶',
    target: 10,
    current: 0,
    unit: 'km',
    increment: 0.5,
    xpReward: 20,
    difficulty: 'hard',
    streak: 0,
    completedToday: false,
    scheduleDays: ALL_DAYS,
    reminderEnabled: true,
    reminderTime: { hour: 7, minute: 30 },
    level: 1,
    habitXp: 0,
    xpToNextLevel: 100,
    order: 1,
  },
  {
    id: 'reading',
    name: 'Kitap Oku',
    icon: '📖',
    target: 30,
    current: 0,
    unit: 'dk',
    increment: 5,
    xpReward: 10,
    difficulty: 'medium',
    streak: 0,
    completedToday: false,
    scheduleDays: ALL_DAYS,
    reminderEnabled: true,
    reminderTime: { hour: 20, minute: 0 },
    level: 1,
    habitXp: 0,
    xpToNextLevel: 100,
    order: 2,
  },
  {
    id: 'meditation',
    name: 'Meditasyon',
    icon: '🧘',
    target: 15,
    current: 0,
    unit: 'dk',
    increment: 5,
    xpReward: 5,
    difficulty: 'easy',
    streak: 0,
    completedToday: false,
    scheduleDays: [1, 2, 3, 4, 5],
    reminderEnabled: true,
    reminderTime: { hour: 6, minute: 30 },
    level: 1,
    habitXp: 0,
    xpToNextLevel: 100,
    order: 3,
  },
];

export const HABIT_TEMPLATES: Omit<Habit, 'id' | 'streak' | 'current' | 'completedToday' | 'order' | 'reminderEnabled' | 'reminderTime' | 'notificationIds'>[] = [
  { name: 'Su İç', icon: '💧', target: 3, unit: 'L', increment: 0.25, xpReward: 10, difficulty: 'medium', scheduleDays: ALL_DAYS, level: 1, habitXp: 0, xpToNextLevel: 100 },
  { name: 'Yürüyüş', icon: '🚶', target: 10, unit: 'km', increment: 0.5, xpReward: 20, difficulty: 'hard', scheduleDays: ALL_DAYS, level: 1, habitXp: 0, xpToNextLevel: 100 },
  { name: 'Kitap Oku', icon: '📖', target: 30, unit: 'dk', increment: 5, xpReward: 10, difficulty: 'medium', scheduleDays: ALL_DAYS, level: 1, habitXp: 0, xpToNextLevel: 100 },
  { name: 'Meditasyon', icon: '🧘', target: 15, unit: 'dk', increment: 5, xpReward: 5, difficulty: 'easy', scheduleDays: ALL_DAYS, level: 1, habitXp: 0, xpToNextLevel: 100 },
  { name: 'Egzersiz', icon: '💪', target: 45, unit: 'dk', increment: 15, xpReward: 20, difficulty: 'hard', scheduleDays: ALL_DAYS, level: 1, habitXp: 0, xpToNextLevel: 100 },
  { name: 'Koşu', icon: '🏃', target: 5, unit: 'km', increment: 1, xpReward: 20, difficulty: 'hard', scheduleDays: ALL_DAYS, level: 1, habitXp: 0, xpToNextLevel: 100 },
  { name: 'Uyku', icon: '😴', target: 8, unit: 'saat', increment: 1, xpReward: 10, difficulty: 'medium', scheduleDays: ALL_DAYS, level: 1, habitXp: 0, xpToNextLevel: 100 },
  { name: 'Meyve Ye', icon: '🍎', target: 5, unit: 'porsiyon', increment: 1, xpReward: 5, difficulty: 'easy', scheduleDays: ALL_DAYS, level: 1, habitXp: 0, xpToNextLevel: 100 },
];

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Bartu',
  avatar: 'avatar_starter',
  level: 1,
  currentXP: 0,
  totalXP: 0,
  xpBalance: 0,
  badges: [],
  inventory: {
    avatars: [],
    themes: [],
    boosters: 0,
    streakFreezes: 0,
    titles: [],
    specialBadges: [],
    badgeFrames: [],
    levelAuras: [],
    aiInsightsPacks: 0,
    mysteryBoxesOpened: 0,
  },
  activeEffects: {
    xpBoosterUntil: null,
    doubleXpUntil: null,
    focusModeUntil: null,
    chestLuckUntil: null,
    comboBoostUntil: null,
  },
  activeTitle: null,
  levelUnlockedAvatars: ['avatar_starter'],
  soundEnabled: true,
  notificationsEnabled: true,
  notificationHour: 21,
  notificationMinute: 0,
};

export const SHOP_ITEMS: ShopItem[] = [
  // Gorunumler - Avatarlar
  { id: 'avatar_ninja', name: 'Ninja', icon: '🥷', price: 150, type: 'avatar', category: 'appearances', description: 'Gizli ve hızlı ninja avatarı' },
  { id: 'avatar_alien', name: 'Uzaylı', icon: '👽', price: 200, type: 'avatar', category: 'appearances', description: 'Galaksiler arası gezgin' },
  { id: 'avatar_robot', name: 'Robot', icon: '🤖', price: 200, type: 'avatar', category: 'appearances', description: 'Mekanik güç avatarı' },
  { id: 'avatar_pirate', name: 'Korsan', icon: '🏴‍☠️', price: 250, type: 'avatar', category: 'appearances', description: 'Denizlerin hakimi' },
  // Gorunumler - Temalar
  { id: 'theme_ocean', name: 'Okyanus Teması', icon: '🌊', price: 500, type: 'theme', category: 'appearances', description: 'Sakin mavi tonlarında tema' },
  { id: 'theme_forest', name: 'Orman Teması', icon: '🌲', price: 500, type: 'theme', category: 'appearances', description: 'Doğanın yeşil huzuru' },
  { id: 'theme_sunset', name: 'Gün Batımı', icon: '🌅', price: 500, type: 'theme', category: 'appearances', description: 'Sıcak turuncu tonları' },
  // Guclendirmeler
  { id: 'streak_freeze', name: 'Seri Koruyucu', icon: '🛡️', price: 200, type: 'streakFreeze', category: 'powerups', description: 'Bir günlük seri kaybını engeller', effect: 'Seri kaybını 1 kez engeller' },
  { id: 'xp_booster', name: 'XP Güçlendirici', icon: '⚡', price: 300, type: 'xpBooster', category: 'powerups', description: '24 saat boyunca %20 ekstra XP', duration: '24 saat', effect: 'Kazanılan XP x1.2' },
  { id: 'chest_luck', name: 'Şans Artırıcı', icon: '🍀', price: 250, type: 'chestLuck', category: 'powerups', description: 'Sandıktan daha iyi ödül şansı', duration: '24 saat', effect: 'Nadir ödül oranı artar' },
  { id: 'combo_boost', name: 'Kombo Güçlendirici', icon: '🔥', price: 200, type: 'comboBoost', category: 'powerups', description: 'Günde 3+ görev tamamlayınca bonus XP', duration: '24 saat', effect: 'Her combo +15 bonus XP' },
  // Prestij
  { id: 'title_legend', name: 'Efsane Ünvanı', icon: '👑', price: 400, type: 'title', category: 'prestige', description: '"Efsane" ünvanını profilinde göster' },
  { id: 'title_champion', name: 'Şampiyon Ünvanı', icon: '🏆', price: 600, type: 'title', category: 'prestige', description: '"Şampiyon" ünvanını profilinde göster' },
  { id: 'badge_diamond', name: 'Elmas Rozet', icon: '💎', price: 800, type: 'specialBadge', category: 'prestige', description: 'Nadir elmas rozeti' },
  { id: 'badge_crown', name: 'Taç Rozet', icon: '👑', price: 1000, type: 'specialBadge', category: 'prestige', description: 'Eşsiz kraliyet rozeti' },
];

export const LEADERBOARD_DATA: LeaderboardEntry[] = [
  { id: '1', name: 'Zeynep', avatar: '👩‍🔬', level: 12, xp: 4850, weeklyXp: 820, monthlyXp: 3100, streak: 45, isFriend: true },
  { id: '2', name: 'Ahmet', avatar: '🧑‍💻', level: 10, xp: 3920, weeklyXp: 650, monthlyXp: 2400, streak: 30, isFriend: true },
  { id: '3', name: 'Elif', avatar: '👩‍🎨', level: 8, xp: 2750, weeklyXp: 540, monthlyXp: 1800, streak: 21, isFriend: true },
  { id: '4', name: 'Bartu', avatar: '🧙‍♂️', level: 1, xp: 0, weeklyXp: 0, monthlyXp: 0, streak: 0 },
  { id: '5', name: 'Can', avatar: '🧑‍🚀', level: 6, xp: 1890, weeklyXp: 380, monthlyXp: 1200, streak: 14 },
  { id: '6', name: 'Deniz', avatar: '🧜‍♀️', level: 5, xp: 1450, weeklyXp: 290, monthlyXp: 950, streak: 10 },
  { id: '7', name: 'Emre', avatar: '🦸‍♂️', level: 4, xp: 980, weeklyXp: 210, monthlyXp: 680, streak: 7 },
];

export const ALL_BADGES: Badge[] = [
  { id: 'water_monster', name: 'Su Canavarı', icon: '🌊', description: '7 gün üst üste su hedefini tamamla', requirement: 'water_streak_7', unlocked: false },
  { id: 'marathon', name: 'Maraton Koşucu', icon: '🏅', description: 'Toplam 100km yürüyüş yap', requirement: 'walk_total_100', unlocked: false },
  { id: 'bookworm', name: 'Kitap Kurdu', icon: '📚', description: '30 gün üst üste kitap oku', requirement: 'reading_streak_30', unlocked: false },
  { id: 'zen_master', name: 'Zen Ustası', icon: '☯️', description: '14 gün üst üste meditasyon yap', requirement: 'meditation_streak_14', unlocked: false },
  { id: 'first_step', name: 'İlk Adım', icon: '👣', description: 'İlk alışkanlığını tamamla', requirement: 'first_complete', unlocked: false },
  { id: 'level5', name: 'Çırak', icon: '⭐', description: 'Seviye 5\'e ulaş', requirement: 'level_5', unlocked: false },
  { id: 'level10', name: 'Usta', icon: '🌟', description: 'Seviye 10\'a ulaş', requirement: 'level_10', unlocked: false },
  { id: 'streak7', name: 'Haftalık Savaşçı', icon: '🔥', description: 'Herhangi bir alışkanlıkta 7 gün seri yap', requirement: 'any_streak_7', unlocked: false },
  { id: 'streak30', name: 'Ay Yıldızı', icon: '🌙', description: 'Herhangi bir alışkanlıkta 30 gün seri yap', requirement: 'any_streak_30', unlocked: false },
  { id: 'xp1000', name: 'XP Avcısı', icon: '💎', description: 'Toplam 1000 XP kazan', requirement: 'total_xp_1000', unlocked: false },
  { id: 'complete100', name: 'Yuzcu', icon: '🏅', description: 'Toplam 100 aliskanlik tamamla', requirement: 'total_complete_100', unlocked: false },
];

