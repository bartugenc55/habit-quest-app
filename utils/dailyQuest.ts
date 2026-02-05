import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit } from './sampleData';

const QUEST_KEY = '@habitquest_daily_quest';

export type QuestType = 'complete_3' | 'hardest_habit' | 'maintain_streak';

export interface DailyQuest {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  xpReward: number;
  targetHabitId?: string;
  date: string;
  completed: boolean;
  progress: number;
  goal: number;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function pickQuest(habits: Habit[]): DailyQuest {
  const today = getTodayString();
  const todayWeekday = new Date().getDay();
  const todaysHabits = habits.filter(
    (h) => !h.isArchived && (h.scheduleDays ?? [0, 1, 2, 3, 4, 5, 6]).includes(todayWeekday),
  );

  const types: QuestType[] = ['complete_3', 'hardest_habit', 'maintain_streak'];

  // Filter valid quest types
  const valid: QuestType[] = [];
  if (todaysHabits.length >= 3) valid.push('complete_3');

  const hardest = todaysHabits.filter((h) => h.difficulty === 'hard');
  if (hardest.length > 0) valid.push('hardest_habit');

  const withStreak = todaysHabits.filter((h) => h.streak > 0);
  if (withStreak.length > 0) valid.push('maintain_streak');

  // Fallback to complete_3 if nothing valid
  if (valid.length === 0) valid.push('complete_3');

  const type = valid[Math.floor(Math.random() * valid.length)];

  switch (type) {
    case 'complete_3':
      return {
        id: `quest_${today}`,
        type: 'complete_3',
        title: 'Uclu Kombo',
        description: 'Bugun 3 aliskanlik tamamla',
        xpReward: 20,
        date: today,
        completed: false,
        progress: 0,
        goal: 3,
      };
    case 'hardest_habit': {
      const target = hardest[Math.floor(Math.random() * hardest.length)];
      return {
        id: `quest_${today}`,
        type: 'hardest_habit',
        title: 'Zor Gorev',
        description: `${target.icon} ${target.name} gorevini tamamla`,
        xpReward: 25,
        targetHabitId: target.id,
        date: today,
        completed: false,
        progress: 0,
        goal: 1,
      };
    }
    case 'maintain_streak': {
      const target = withStreak.sort((a, b) => b.streak - a.streak)[0];
      return {
        id: `quest_${today}`,
        type: 'maintain_streak',
        title: 'Seri Koruyucu',
        description: `${target.icon} ${target.name} serini koru (${target.streak} gun)`,
        xpReward: 15,
        targetHabitId: target.id,
        date: today,
        completed: false,
        progress: 0,
        goal: 1,
      };
    }
  }
}

export async function loadOrCreateDailyQuest(habits: Habit[]): Promise<DailyQuest> {
  const today = getTodayString();
  try {
    const data = await AsyncStorage.getItem(QUEST_KEY);
    if (data) {
      const quest: DailyQuest = JSON.parse(data);
      if (quest.date === today) return quest;
    }
  } catch {}

  const quest = pickQuest(habits);
  await AsyncStorage.setItem(QUEST_KEY, JSON.stringify(quest));
  return quest;
}

export async function saveDailyQuest(quest: DailyQuest): Promise<void> {
  await AsyncStorage.setItem(QUEST_KEY, JSON.stringify(quest));
}

export function evaluateQuestProgress(quest: DailyQuest, habits: Habit[]): DailyQuest {
  if (quest.completed) return quest;

  const todayWeekday = new Date().getDay();
  const todaysHabits = habits.filter(
    (h) => !h.isArchived && (h.scheduleDays ?? [0, 1, 2, 3, 4, 5, 6]).includes(todayWeekday),
  );

  switch (quest.type) {
    case 'complete_3': {
      const completed = todaysHabits.filter((h) => h.completedToday).length;
      const done = completed >= quest.goal;
      return { ...quest, progress: Math.min(completed, quest.goal), completed: done };
    }
    case 'hardest_habit': {
      const target = habits.find((h) => h.id === quest.targetHabitId);
      const done = target?.completedToday ?? false;
      return { ...quest, progress: done ? 1 : 0, completed: done };
    }
    case 'maintain_streak': {
      const target = habits.find((h) => h.id === quest.targetHabitId);
      const done = target?.completedToday ?? false;
      return { ...quest, progress: done ? 1 : 0, completed: done };
    }
  }
}
