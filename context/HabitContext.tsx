import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Habit,
  UserProfile,
  Badge,
  DailyLogs,
  DailyHabitLog,
  DEFAULT_HABITS,
  DEFAULT_PROFILE,
  ALL_BADGES,
  ALL_DAYS,
  SHOP_ITEMS,
} from '../utils/sampleData';
import { saveHabits, loadHabits, saveProfile, loadProfile, getLastResetDate, setLastResetDate, saveDailyLogs, loadDailyLogs, getLastDailyClaimDate, setLastDailyClaimDate, getLastShieldGrantDate, setLastShieldGrantDate } from '../utils/storage';
import { calculateXPGain, checkLevelUp, getXPForDifficulty, isBoostActive } from '../utils/xp';
import { scheduleHabitReminders, cancelHabitReminders, ensureRemindersScheduled } from '../utils/notifications';
import { computeHabitStreak } from '../utils/stats';
import { DailyChestReward, rollDailyChest } from '../utils/dailyChest';
import { DailyQuest, loadOrCreateDailyQuest, saveDailyQuest, evaluateQuestProgress } from '../utils/dailyQuest';
import { fetchUserData, upsertUserData, mergeData, CloudPayload } from '../utils/cloudSync';
import { getAvatarsForLevel } from '../constants/avatars';
import { useAuth } from './AuthContext';

export interface LevelUpInfo {
  oldLevel: number;
  newLevel: number;
  xpGained: number;
}

export interface HabitLevelUpInfo {
  habitId: string;
  habitName: string;
  oldLevel: number;
  newLevel: number;
}

export interface PendingShieldDecision {
  habitsAtRisk: { id: string; name: string; icon: string; streak: number }[];
  shieldsAvailable: number;
}

interface HabitContextType {
  habits: Habit[];
  profile: UserProfile;
  badges: Badge[];
  dailyLogs: DailyLogs;
  addHabit: (habit: Omit<Habit, 'id' | 'current' | 'streak' | 'completedToday' | 'order' | 'notificationIds'>) => Promise<void>;
  updateHabit: (id: string, updates: Partial<Pick<Habit, 'name' | 'icon' | 'target' | 'unit' | 'increment' | 'xpReward' | 'difficulty' | 'scheduleDays' | 'reminderEnabled' | 'reminderTime'>>) => void;
  removeHabit: (id: string) => void;
  incrementHabit: (id: string) => void;
  decrementHabit: (id: string) => void;
  reorderHabits: (orderedIds: string[]) => void;
  archiveHabit: (id: string) => void;
  unarchiveHabit: (id: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  purchaseItem: (itemId: string) => boolean;
  dailyChestAvailable: boolean;
  claimDailyChest: () => Promise<DailyChestReward | null>;
  comboCount: number;
  streakFreezeUsed: boolean;
  dismissStreakFreezeNotice: () => void;
  isLoading: boolean;
  levelUpInfo: LevelUpInfo | null;
  pendingBadges: Badge[];
  dismissLevelUp: () => void;
  habitLevelUpInfo: HabitLevelUpInfo | null;
  dismissHabitLevelUp: () => void;
  bonusXP: number | null;
  dismissBonusXP: () => void;
  pendingShield: PendingShieldDecision | null;
  applyShield: () => void;
  declineShield: () => void;
  dailyQuest: DailyQuest | null;
  questJustCompleted: boolean;
  dismissQuestComplete: () => void;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
}

const HabitContext = createContext<HabitContextType | undefined>(undefined);

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function checkBadges(habits: Habit[], profile: UserProfile, currentBadges: Badge[], dailyLogs: DailyLogs): Badge[] {
  return currentBadges.map((badge) => {
    if (badge.unlocked) return badge;

    let unlocked = false;
    switch (badge.requirement) {
      case 'first_complete':
        unlocked = habits.some((h) => h.completedToday);
        break;
      case 'water_streak_7':
        unlocked = (habits.find((h) => h.id === 'water')?.streak ?? 0) >= 7;
        break;
      case 'reading_streak_30':
        unlocked = (habits.find((h) => h.id === 'reading')?.streak ?? 0) >= 30;
        break;
      case 'meditation_streak_14':
        unlocked = (habits.find((h) => h.id === 'meditation')?.streak ?? 0) >= 14;
        break;
      case 'walk_total_100':
        unlocked = (habits.find((h) => h.id === 'walk')?.streak ?? 0) >= 10;
        break;
      case 'level_5':
        unlocked = profile.level >= 5;
        break;
      case 'level_10':
        unlocked = profile.level >= 10;
        break;
      case 'any_streak_7':
        unlocked = habits.some((h) => h.streak >= 7);
        break;
      case 'any_streak_30':
        unlocked = habits.some((h) => h.streak >= 30);
        break;
      case 'total_xp_1000':
        unlocked = profile.totalXP >= 1000;
        break;
      case 'total_complete_100': {
        const todayCompleted = habits.filter((h) => h.completedToday).length;
        const logCompleted = Object.values(dailyLogs).reduce(
          (sum, dayLog) => sum + Object.values(dayLog).filter((h) => h.completed).length,
          0,
        );
        unlocked = (logCompleted + todayCompleted) >= 100;
        break;
      }
    }

    return { ...badge, unlocked };
  });
}

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>(DEFAULT_HABITS);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [badges, setBadges] = useState<Badge[]>(ALL_BADGES);
  const [dailyLogs, setDailyLogs] = useState<DailyLogs>({});
  const [isLoading, setIsLoading] = useState(true);
  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);
  const [pendingBadges, setPendingBadges] = useState<Badge[]>([]);
  const [dailyChestAvailable, setDailyChestAvailable] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [streakFreezeUsed, setStreakFreezeUsed] = useState(false);
  const [habitLevelUpInfo, setHabitLevelUpInfo] = useState<HabitLevelUpInfo | null>(null);
  const [bonusXP, setBonusXP] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingShield, setPendingShield] = useState<PendingShieldDecision | null>(null);
  const [dailyQuest, setDailyQuest] = useState<DailyQuest | null>(null);
  const [questJustCompleted, setQuestJustCompleted] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initDoneRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        let [savedHabits, savedProfile, lastReset, savedLogs, lastDailyClaim, lastShieldGrant] = await Promise.all([
          loadHabits(),
          loadProfile(),
          getLastResetDate(),
          loadDailyLogs(),
          getLastDailyClaimDate(),
          getLastShieldGrantDate(),
        ]);

        // Pull cloud data and merge
        if (user?.id) {
          try {
            const cloudData = await fetchUserData(user.id);
            const localPayload: CloudPayload = {
              habits: savedHabits ?? DEFAULT_HABITS,
              profile: savedProfile ?? DEFAULT_PROFILE,
              dailyLogs: savedLogs ?? {},
              lastResetDate: lastReset,
              lastDailyClaim: lastDailyClaim,
            };
            const merged = mergeData(localPayload, cloudData);
            savedHabits = merged.habits;
            savedProfile = merged.profile;
            savedLogs = merged.dailyLogs;
            lastReset = merged.lastResetDate;
            lastDailyClaim = merged.lastDailyClaim;
          } catch (e) {
            console.warn('Cloud sync pull failed, using local data:', e);
          }
        }

        let currentHabits = (savedHabits ?? DEFAULT_HABITS).map((h: any, i: number) => {
          const difficulty = h.difficulty ?? 'medium';
          const migrated: Habit = {
            ...h,
            scheduleDays: h.scheduleDays ?? ALL_DAYS,
            level: h.level ?? 1,
            habitXp: h.habitXp ?? 0,
            xpToNextLevel: h.xpToNextLevel ?? 100,
            order: h.order ?? i,
            difficulty,
            xpReward: h.difficulty ? h.xpReward : getXPForDifficulty(difficulty),
          };
          // Migrate old notificationHour/notificationMinute → reminderEnabled/reminderTime
          if (h.notificationHour != null && migrated.reminderTime == null) {
            migrated.reminderEnabled = true;
            migrated.reminderTime = { hour: h.notificationHour, minute: h.notificationMinute ?? 0 };
          }
          return migrated;
        });
        let currentProfile = savedProfile ?? DEFAULT_PROFILE;
        let currentLogs = savedLogs ?? {};
        let pendingShieldDecision: PendingShieldDecision | null = null;

        const today = getTodayString();
        if (lastReset !== today) {
          // Gün değişmeden önce, dünkü tamamlanma durumunu log'a kaydet
          if (lastReset) {
            const dayLog: Record<string, DailyHabitLog> = {};
            for (const h of currentHabits) {
              dayLog[h.id] = {
                completed: h.completedToday,
                xpEarned: h.completedToday ? calculateXPGain(h.xpReward, h.streak) : 0,
                value: h.current,
              };
            }
            // Sadece log yoksa kaydet (uygulama çökerse tekrar yazmasın)
            if (!currentLogs[lastReset]) {
              currentLogs[lastReset] = dayLog;
            }
          }

          // Auto-grant streak shield every 7 days
          const shieldsCount = currentProfile.inventory?.streakFreezes ?? 0;
          if (lastShieldGrant) {
            const grantDate = new Date(lastShieldGrant);
            const now = new Date(today);
            const diffDays = Math.floor((now.getTime() - grantDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 7) {
              currentProfile = {
                ...currentProfile,
                inventory: { ...currentProfile.inventory, streakFreezes: shieldsCount + 1 },
              };
              lastShieldGrant = today;
              await setLastShieldGrantDate(today);
            }
          } else {
            // First time: set grant date (don't grant immediately)
            lastShieldGrant = today;
            await setLastShieldGrantDate(today);
          }

          // Detect habits whose streaks would break
          const habitsAtRisk: { id: string; name: string; icon: string; streak: number }[] = [];
          const freezesAvailable = currentProfile.inventory?.streakFreezes ?? 0;

          currentHabits = currentHabits.map((h) => {
            const computedStreak = computeHabitStreak(h.id, currentLogs, false, h.scheduleDays);
            if (!h.completedToday && h.streak > 0 && computedStreak === 0) {
              habitsAtRisk.push({ id: h.id, name: h.name, icon: h.icon, streak: h.streak });
            }
            // Reset daily progress but DON'T break streaks yet if shields available
            if (!h.completedToday && h.streak > 0 && computedStreak === 0 && freezesAvailable > 0) {
              // Keep streak temporarily — user will decide via popup
              return { ...h, current: 0, completedToday: false, streak: h.streak };
            }
            return { ...h, current: 0, completedToday: false, streak: computedStreak };
          });

          // If shields are available and habits are at risk, show confirmation popup
          if (habitsAtRisk.length > 0 && freezesAvailable > 0) {
            pendingShieldDecision = {
              habitsAtRisk,
              shieldsAvailable: freezesAvailable,
            };
          }

          await setLastResetDate(today);
          await saveHabits(currentHabits);
          await saveDailyLogs(currentLogs);
        } else {
          // Bugün zaten reset olmuş, streak'leri yine de doğrula
          currentHabits = currentHabits.map((h) => ({
            ...h,
            streak: computeHabitStreak(h.id, currentLogs, h.completedToday, h.scheduleDays),
          }));
        }

        if (currentProfile.notificationsEnabled) {
          currentHabits = await ensureRemindersScheduled(
            {
              notificationsEnabled: true,
              notificationHour: currentProfile.notificationHour ?? 21,
              notificationMinute: currentProfile.notificationMinute ?? 0,
            },
            currentHabits,
          );
          await saveHabits(currentHabits);
        }

        // Daily chest: bugun zaten claim edildi mi?
        setDailyChestAvailable(lastDailyClaim !== today);

        // Combo count: bugunun tamamlanan gorev sayisi
        const todayLog = currentLogs[today];
        const todayCompleted = todayLog
          ? Object.values(todayLog).filter((l) => l.completed).length
          : 0;
        setComboCount(todayCompleted);

        // Streak shield pending decision
        setPendingShield(pendingShieldDecision);

        setHabits(currentHabits);
        setProfile(currentProfile);
        setDailyLogs(currentLogs);
        setBadges(checkBadges(currentHabits, currentProfile, ALL_BADGES, currentLogs));

        // Load or create daily quest
        const quest = await loadOrCreateDailyQuest(currentHabits);
        const evaluated = evaluateQuestProgress(quest, currentHabits);
        setDailyQuest(evaluated);
        if (evaluated.completed && !quest.completed) {
          await saveDailyQuest(evaluated);
        }
      } catch (e) {
        console.error('HabitContext init failed:', e);
      } finally {
        setIsLoading(false);
        initDoneRef.current = true;
      }
    })();
  }, [user?.id]);

  // --- Cloud sync helpers ---
  const scheduleCloudPush = useCallback(() => {
    if (!user?.id || !initDoneRef.current) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        const [h, p, l, lr, ldc] = await Promise.all([
          loadHabits(), loadProfile(), loadDailyLogs(), getLastResetDate(), getLastDailyClaimDate(),
        ]);
        const payload: CloudPayload = {
          habits: h ?? [],
          profile: p ?? DEFAULT_PROFILE,
          dailyLogs: l ?? {},
          lastResetDate: lr,
          lastDailyClaim: ldc,
        };
        await upsertUserData(user.id, payload);
      } catch (e) {
        console.warn('Cloud push failed:', e);
      }
    }, 3000);
  }, [user?.id]);

  const syncNow = useCallback(async () => {
    if (!user?.id) return;
    setIsSyncing(true);
    try {
      const [h, p, l, lr, ldc] = await Promise.all([
        loadHabits(), loadProfile(), loadDailyLogs(), getLastResetDate(), getLastDailyClaimDate(),
      ]);
      const localPayload: CloudPayload = {
        habits: h ?? [],
        profile: p ?? DEFAULT_PROFILE,
        dailyLogs: l ?? {},
        lastResetDate: lr,
        lastDailyClaim: ldc,
      };
      await upsertUserData(user.id, localPayload);

      const cloudData = await fetchUserData(user.id);
      if (cloudData) {
        setHabits(cloudData.habits);
        setProfile(cloudData.profile);
        setDailyLogs(cloudData.dailyLogs);
        setBadges(checkBadges(cloudData.habits, cloudData.profile, ALL_BADGES, cloudData.dailyLogs));
      }
    } catch (e) {
      console.warn('Manual sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id]);

  const persistHabits = useCallback(async (newHabits: Habit[]) => {
    setHabits(newHabits);
    await saveHabits(newHabits);
    scheduleCloudPush();
  }, [scheduleCloudPush]);

  const persistProfile = useCallback(async (newProfile: UserProfile) => {
    // Auto-unlock avatars based on current level
    const levelAvatars = getAvatarsForLevel(newProfile.level).map((a) => a.id);
    const existing = newProfile.levelUnlockedAvatars ?? [];
    const merged = Array.from(new Set([...existing, ...levelAvatars]));
    let finalProfile = { ...newProfile, levelUnlockedAvatars: merged };

    // If no active avatar set, default to first available
    if (!finalProfile.avatar || finalProfile.avatar === '') {
      const first = merged[0] ?? (finalProfile.inventory?.avatars?.[0]);
      if (first) finalProfile = { ...finalProfile, avatar: first };
    }

    setProfile(finalProfile);
    await saveProfile(finalProfile);
    scheduleCloudPush();
  }, [scheduleCloudPush]);

  const persistDailyLogs = useCallback(async (newLogs: DailyLogs) => {
    setDailyLogs(newLogs);
    await saveDailyLogs(newLogs);
    scheduleCloudPush();
  }, [scheduleCloudPush]);

  const addHabit = useCallback(
    async (habit: Omit<Habit, 'id' | 'current' | 'streak' | 'completedToday' | 'order' | 'notificationIds'>) => {
      let newHabit: Habit = {
        ...habit,
        id: Date.now().toString(),
        current: 0,
        streak: 0,
        completedToday: false,
        scheduleDays: habit.scheduleDays ?? ALL_DAYS,
        order: habits.length,
      };
      // Schedule notifications if globally enabled and habit has reminder
      if (profile.notificationsEnabled && newHabit.reminderEnabled && newHabit.reminderTime) {
        const ids = await scheduleHabitReminders(newHabit);
        newHabit = { ...newHabit, notificationIds: ids };
      }
      const updated = [...habits, newHabit];
      persistHabits(updated);
    },
    [habits, profile.notificationsEnabled, persistHabits]
  );

  const updateHabit = useCallback(
    async (id: string, updates: Partial<Pick<Habit, 'name' | 'icon' | 'target' | 'unit' | 'increment' | 'xpReward' | 'difficulty' | 'scheduleDays' | 'reminderEnabled' | 'reminderTime'>>) => {
      // Auto-set xpReward from difficulty when difficulty changes
      if (updates.difficulty) {
        updates = { ...updates, xpReward: getXPForDifficulty(updates.difficulty) };
      }
      const oldHabit = habits.find((h) => h.id === id);
      let updated = habits.map((h) => (h.id === id ? { ...h, ...updates } : h));

      // Reschedule notifications if reminder settings or scheduleDays changed
      if (oldHabit && profile.notificationsEnabled) {
        const reminderChanged =
          updates.reminderEnabled !== undefined ||
          updates.reminderTime !== undefined ||
          updates.scheduleDays !== undefined;

        if (reminderChanged) {
          const updatedHabit = updated.find((h) => h.id === id)!;
          await cancelHabitReminders(oldHabit.id);
          if (updatedHabit.reminderEnabled && updatedHabit.reminderTime) {
            const ids = await scheduleHabitReminders(updatedHabit);
            updated = updated.map((h) => (h.id === id ? { ...h, notificationIds: ids } : h));
          } else {
            updated = updated.map((h) => (h.id === id ? { ...h, notificationIds: [] } : h));
          }
        }
      }

      persistHabits(updated);
    },
    [habits, profile.notificationsEnabled, persistHabits]
  );

  const removeHabit = useCallback(
    async (id: string) => {
      const habit = habits.find((h) => h.id === id);
      if (habit) {
        await cancelHabitReminders(habit.id);
      }
      const updated = habits.filter((h) => h.id !== id);
      persistHabits(updated);

      // Clean up dailyLogs entries for the removed habit
      const cleanedLogs = { ...dailyLogs };
      let logsChanged = false;
      for (const date of Object.keys(cleanedLogs)) {
        if (cleanedLogs[date][id]) {
          const { [id]: _, ...rest } = cleanedLogs[date];
          cleanedLogs[date] = rest;
          logsChanged = true;
        }
      }
      if (logsChanged) {
        persistDailyLogs(cleanedLogs);
      }
    },
    [habits, dailyLogs, persistHabits, persistDailyLogs]
  );

  const reorderHabits = useCallback(
    (orderedIds: string[]) => {
      const updated = habits.map((h) => {
        const idx = orderedIds.indexOf(h.id);
        return idx !== -1 ? { ...h, order: idx } : h;
      });
      persistHabits(updated);
    },
    [habits, persistHabits]
  );

  const archiveHabit = useCallback(
    async (id: string) => {
      const habit = habits.find((h) => h.id === id);
      if (habit) {
        await cancelHabitReminders(habit.id);
      }
      const updated = habits.map((h) => (h.id === id ? { ...h, isArchived: true, notificationIds: [] } : h));
      persistHabits(updated);
    },
    [habits, persistHabits]
  );

  const unarchiveHabit = useCallback(
    async (id: string) => {
      let updated = habits.map((h) => (h.id === id ? { ...h, isArchived: false } : h));
      // Reschedule notifications if globally enabled
      if (profile.notificationsEnabled) {
        const habit = updated.find((h) => h.id === id);
        if (habit && habit.reminderEnabled && habit.reminderTime) {
          const ids = await scheduleHabitReminders(habit);
          updated = updated.map((h) => (h.id === id ? { ...h, notificationIds: ids } : h));
        }
      }
      persistHabits(updated);
    },
    [habits, profile.notificationsEnabled, persistHabits]
  );

  const incrementHabit = useCallback(
    (id: string) => {
      const habitIndex = habits.findIndex((h) => h.id === id);
      if (habitIndex === -1) return;

      const habit = habits[habitIndex];
      if (habit.completedToday) return;

      const newCurrent = Math.min(habit.current + habit.increment, habit.target);
      const justCompleted = newCurrent >= habit.target;

      let habitXp = habit.habitXp;
      let habitLevel = habit.level;
      let habitXpToNext = habit.xpToNextLevel;
      let didHabitLevelUp: HabitLevelUpInfo | null = null;

      if (justCompleted) {
        habitXp += 20;
        if (habitXp >= habitXpToNext) {
          const oldLevel = habitLevel;
          habitLevel += 1;
          habitXp = 0;
          habitXpToNext = Math.round(habitXpToNext * 1.4);
          didHabitLevelUp = {
            habitId: habit.id,
            habitName: habit.name,
            oldLevel,
            newLevel: habitLevel,
          };
        }
      }

      const updatedHabit: Habit = {
        ...habit,
        current: newCurrent,
        completedToday: justCompleted,
        streak: justCompleted ? habit.streak + 1 : habit.streak,
        habitXp,
        level: habitLevel,
        xpToNextLevel: habitXpToNext,
      };

      const updatedHabits = [...habits];
      updatedHabits[habitIndex] = updatedHabit;

      let updatedProfile = profile;
      let didLevelUp: LevelUpInfo | null = null;
      let xpGain = 0;

      // DailyLog'a her increment'te value kaydet
      const today = getTodayString();
      const updatedLogs = { ...dailyLogs };
      if (!updatedLogs[today]) updatedLogs[today] = {};
      const prevLog = updatedLogs[today][id];

      if (justCompleted) {
        const hasBooster = isBoostActive(profile.activeEffects?.xpBoosterUntil);
        const newCombo = comboCount + 1;
        xpGain = calculateXPGain(habit.xpReward, updatedHabit.streak, hasBooster, newCombo);
        // Combo Boost: bonus XP when 3+ tasks completed today
        const hasComboBoost = isBoostActive(profile.activeEffects?.comboBoostUntil);
        if (hasComboBoost && newCombo >= 3) {
          xpGain += 15;
        }
        setComboCount(newCombo);
        const newCurrentXP = profile.currentXP + xpGain;
        const newTotalXP = profile.totalXP + xpGain;
        const newXpBalance = (profile.xpBalance ?? 0) + xpGain;
        const { newLevel, remainingXP } = checkLevelUp(newCurrentXP, profile.level);

        updatedProfile = {
          ...profile,
          currentXP: remainingXP,
          totalXP: newTotalXP,
          xpBalance: newXpBalance,
          level: newLevel,
        };

        if (newLevel > profile.level) {
          didLevelUp = {
            oldLevel: profile.level,
            newLevel,
            xpGained: xpGain,
          };
        }

        persistProfile(updatedProfile);
      }

      updatedLogs[today][id] = {
        completed: justCompleted,
        xpEarned: justCompleted ? xpGain : (prevLog?.xpEarned ?? 0),
        value: newCurrent,
      };
      persistDailyLogs(updatedLogs);

      const updatedBadges = checkBadges(updatedHabits, updatedProfile, badges, updatedLogs);
      const newlyUnlocked = updatedBadges.filter(
        (b) => b.unlocked && !badges.find((ob) => ob.id === b.id)?.unlocked
      );

      if (newlyUnlocked.length > 0) {
        updatedProfile = {
          ...updatedProfile,
          badges: [...updatedProfile.badges, ...newlyUnlocked.map((b) => b.id)],
        };
        persistProfile(updatedProfile);
      }

      if (didLevelUp || newlyUnlocked.length > 0) {
        setLevelUpInfo(didLevelUp);
        setPendingBadges(newlyUnlocked);
      }

      if (didHabitLevelUp) {
        setHabitLevelUpInfo(didHabitLevelUp);
      }

      // Variable reward: 10% chance of bonus XP on completion
      if (justCompleted && Math.random() < 0.1) {
        const bonus = Math.random() < 0.5 ? 10 : 20;
        updatedProfile = {
          ...updatedProfile,
          currentXP: updatedProfile.currentXP + bonus,
          totalXP: updatedProfile.totalXP + bonus,
          xpBalance: (updatedProfile.xpBalance ?? 0) + bonus,
        };
        const levelCheck = checkLevelUp(updatedProfile.currentXP, updatedProfile.level);
        updatedProfile = {
          ...updatedProfile,
          currentXP: levelCheck.remainingXP,
          level: levelCheck.newLevel,
        };
        persistProfile(updatedProfile);
        setBonusXP(bonus);
      }

      setBadges(updatedBadges);
      persistHabits(updatedHabits);

      // Re-evaluate daily quest
      if (dailyQuest && !dailyQuest.completed) {
        const evaluated = evaluateQuestProgress(dailyQuest, updatedHabits);
        if (evaluated.completed && !dailyQuest.completed) {
          // Award quest XP
          const questXp = evaluated.xpReward;
          updatedProfile = {
            ...updatedProfile,
            currentXP: updatedProfile.currentXP + questXp,
            totalXP: updatedProfile.totalXP + questXp,
            xpBalance: (updatedProfile.xpBalance ?? 0) + questXp,
          };
          const questLevelCheck = checkLevelUp(updatedProfile.currentXP, updatedProfile.level);
          updatedProfile = {
            ...updatedProfile,
            currentXP: questLevelCheck.remainingXP,
            level: questLevelCheck.newLevel,
          };
          persistProfile(updatedProfile);
          setQuestJustCompleted(true);
        }
        setDailyQuest(evaluated);
        saveDailyQuest(evaluated);
      }
    },
    [habits, profile, badges, dailyLogs, dailyQuest, persistHabits, persistProfile, persistDailyLogs]
  );

  const decrementHabit = useCallback(
    (id: string) => {
      const habitIndex = habits.findIndex((h) => h.id === id);
      if (habitIndex === -1) return;

      const habit = habits[habitIndex];
      if (habit.current <= 0) return;

      const wasCompleted = habit.completedToday;
      const newCurrent = Math.max(habit.current - habit.increment, 0);
      const isNowIncomplete = wasCompleted && newCurrent < habit.target;

      const updatedHabit: Habit = {
        ...habit,
        current: newCurrent,
        completedToday: isNowIncomplete ? false : habit.completedToday,
        streak: isNowIncomplete ? Math.max(habit.streak - 1, 0) : habit.streak,
      };

      const updatedHabits = [...habits];
      updatedHabits[habitIndex] = updatedHabit;

      // DailyLog value güncelle
      const today = getTodayString();
      const updatedLogs = { ...dailyLogs };
      if (!updatedLogs[today]) updatedLogs[today] = {};

      if (isNowIncomplete) {
        // Revert XP gained from this habit completion
        const hasBooster = isBoostActive(profile.activeEffects?.xpBoosterUntil);
        const xpToRevert = calculateXPGain(habit.xpReward, habit.streak, hasBooster, comboCount);
        const newCurrentXP = Math.max(profile.currentXP - xpToRevert, 0);
        const newTotalXP = Math.max(profile.totalXP - xpToRevert, 0);
        const newXpBalance = Math.max((profile.xpBalance ?? 0) - xpToRevert, 0);
        const updatedProfile = { ...profile, currentXP: newCurrentXP, totalXP: newTotalXP, xpBalance: newXpBalance };
        persistProfile(updatedProfile);

        if (comboCount > 0) setComboCount(comboCount - 1);
      }

      if (newCurrent > 0) {
        updatedLogs[today][id] = {
          completed: false,
          xpEarned: 0,
          value: newCurrent,
        };
      } else {
        delete updatedLogs[today][id];
      }
      persistDailyLogs(updatedLogs);

      persistHabits(updatedHabits);
    },
    [habits, profile, dailyLogs, comboCount, persistHabits, persistProfile, persistDailyLogs]
  );

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      const updated = { ...profile, ...updates };
      persistProfile(updated);
    },
    [profile, persistProfile]
  );

  const purchaseItem = useCallback(
    (itemId: string): boolean => {
      const item = SHOP_ITEMS.find((i) => i.id === itemId);
      if (!item) return false;
      if ((profile.xpBalance ?? 0) < item.price) return false;

      const inv = profile.inventory ?? {
        avatars: [], themes: [], boosters: 0, streakFreezes: 0, titles: [], specialBadges: [],
      };

      // Tekil itemlarda zaten sahipse engelle
      if (item.type === 'avatar' && inv.avatars.includes(item.id)) return false;
      if (item.type === 'theme' && inv.themes.includes(item.id)) return false;
      if (item.type === 'title' && inv.titles.includes(item.id)) return false;
      if (item.type === 'specialBadge' && inv.specialBadges.includes(item.id)) return false;

      const newBalance = (profile.xpBalance ?? 0) - item.price;
      let newInventory = { ...inv };
      let newEffects = { ...(profile.activeEffects ?? { xpBoosterUntil: null, chestLuckUntil: null, comboBoostUntil: null }) };

      switch (item.type) {
        case 'avatar':
          newInventory = { ...newInventory, avatars: [...inv.avatars, item.id] };
          break;
        case 'theme':
          newInventory = { ...newInventory, themes: [...inv.themes, item.id] };
          break;
        case 'streakFreeze':
          newInventory = { ...newInventory, streakFreezes: inv.streakFreezes + 1 };
          break;
        case 'xpBooster':
          newInventory = { ...newInventory, boosters: inv.boosters + 1 };
          newEffects = { ...newEffects, xpBoosterUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
          break;
        case 'chestLuck':
          newEffects = { ...newEffects, chestLuckUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
          break;
        case 'comboBoost':
          newEffects = { ...newEffects, comboBoostUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };
          break;
        case 'title':
          newInventory = { ...newInventory, titles: [...inv.titles, item.id] };
          break;
        case 'specialBadge':
          newInventory = { ...newInventory, specialBadges: [...inv.specialBadges, item.id] };
          break;
      }

      const updatedProfile: UserProfile = {
        ...profile,
        xpBalance: newBalance,
        inventory: newInventory,
        activeEffects: newEffects,
      };

      // If this is the user's first purchased avatar, auto-equip it
      if (item.type === 'avatar' && inv.avatars.length === 0) {
        updatedProfile.avatar = item.id;
      }

      persistProfile(updatedProfile);
      return true;
    },
    [profile, persistProfile]
  );

  const claimDailyChest = useCallback(async (): Promise<DailyChestReward | null> => {
    if (!dailyChestAvailable) return null;

    const hasLuckBoost = isBoostActive(profile.activeEffects?.chestLuckUntil);
    const reward = rollDailyChest(hasLuckBoost);
    const today = getTodayString();

    let updatedProfile = { ...profile };
    const inv = updatedProfile.inventory ?? {
      avatars: [], themes: [], boosters: 0, streakFreezes: 0, titles: [], specialBadges: [],
    };

    switch (reward.type) {
      case 'xp': {
        const newCurrentXP = updatedProfile.currentXP + reward.amount;
        const newTotalXP = updatedProfile.totalXP + reward.amount;
        const newXpBalance = (updatedProfile.xpBalance ?? 0) + reward.amount;
        const { newLevel, remainingXP } = checkLevelUp(newCurrentXP, updatedProfile.level);
        updatedProfile = {
          ...updatedProfile,
          currentXP: remainingXP,
          totalXP: newTotalXP,
          xpBalance: newXpBalance,
          level: newLevel,
        };
        break;
      }
      case 'streakFreeze':
        updatedProfile = {
          ...updatedProfile,
          inventory: { ...inv, streakFreezes: inv.streakFreezes + reward.amount },
        };
        break;
      case 'xpBooster':
        updatedProfile = {
          ...updatedProfile,
          inventory: { ...inv, boosters: inv.boosters + 1 },
          activeEffects: {
            ...(updatedProfile.activeEffects ?? { xpBoosterUntil: null }),
            xpBoosterUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          },
        };
        break;
    }

    await setLastDailyClaimDate(today);
    await persistProfile(updatedProfile);
    setDailyChestAvailable(false);

    return reward;
  }, [dailyChestAvailable, profile, persistProfile]);

  const dismissStreakFreezeNotice = useCallback(() => {
    setStreakFreezeUsed(false);
  }, []);

  const dismissLevelUp = useCallback(() => {
    setLevelUpInfo(null);
    setPendingBadges([]);
  }, []);

  const dismissHabitLevelUp = useCallback(() => {
    setHabitLevelUpInfo(null);
  }, []);

  const applyShield = useCallback(() => {
    if (!pendingShield) return;
    // Shields were already applied during init (streaks preserved), just consume 1 shield
    const inv = profile.inventory ?? { avatars: [], themes: [], boosters: 0, streakFreezes: 0, titles: [], specialBadges: [] };
    const updatedProfile = {
      ...profile,
      inventory: { ...inv, streakFreezes: Math.max(inv.streakFreezes - 1, 0) },
    };
    persistProfile(updatedProfile);
    setStreakFreezeUsed(true);
    setPendingShield(null);
  }, [pendingShield, profile, persistProfile]);

  const declineShield = useCallback(() => {
    if (!pendingShield) return;
    // Break the streaks that were temporarily preserved
    const atRiskIds = new Set(pendingShield.habitsAtRisk.map((h) => h.id));
    const updated = habits.map((h) => {
      if (atRiskIds.has(h.id)) {
        return { ...h, streak: 0 };
      }
      return h;
    });
    persistHabits(updated);
    setPendingShield(null);
  }, [pendingShield, habits, persistHabits]);

  const dismissQuestComplete = useCallback(() => {
    setQuestJustCompleted(false);
  }, []);

  const dismissBonusXP = useCallback(() => {
    setBonusXP(null);
  }, []);

  return (
    <HabitContext.Provider
      value={{
        habits, profile, badges, dailyLogs,
        addHabit, updateHabit, removeHabit, reorderHabits, archiveHabit, unarchiveHabit, incrementHabit, decrementHabit, updateProfile, purchaseItem,
        dailyChestAvailable, claimDailyChest,
        comboCount,
        streakFreezeUsed, dismissStreakFreezeNotice,
        isLoading,
        levelUpInfo, pendingBadges, dismissLevelUp,
        habitLevelUpInfo, dismissHabitLevelUp,
        bonusXP, dismissBonusXP,
        pendingShield, applyShield, declineShield,
        dailyQuest, questJustCompleted, dismissQuestComplete,
        syncNow, isSyncing,
      }}
    >
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error('useHabits must be used within HabitProvider');
  return ctx;
}
