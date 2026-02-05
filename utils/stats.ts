import { DailyLogs, DailyHabitLog, Habit } from './sampleData';

const DAY_LABELS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Son 7 günün tarihlerini Pzt→Paz sırasıyla döndürür */
export function getWeekDates(): { date: string; label: string }[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Paz, 1=Pzt, ...
  // Pazartesi'yi haftanın başı yap
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const result: { date: string; label: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    result.push({
      date: formatDate(d),
      label: DAY_LABELS[d.getDay()],
    });
  }
  return result;
}

/** Belirli bir günün completion yüzdesi */
export function getCompletionForDate(
  date: string,
  dailyLogs: DailyLogs,
  totalHabits: number,
): number {
  const dayLog = dailyLogs[date];
  if (!dayLog || totalHabits === 0) return 0;
  const completed = Object.values(dayLog).filter((h) => h.completed).length;
  return Math.round((completed / totalHabits) * 100);
}

/** Haftalık completion rates (Pzt→Paz) */
export function getWeeklyCompletion(
  dailyLogs: DailyLogs,
  totalHabits: number,
): { days: string[]; rates: number[] } {
  const week = getWeekDates();
  return {
    days: week.map((w) => w.label),
    rates: week.map((w) => getCompletionForDate(w.date, dailyLogs, totalHabits)),
  };
}

/** Son N gün içinde kazanılan toplam XP */
function getXPForDays(dailyLogs: DailyLogs, numDays: number): number {
  const today = new Date();
  let total = 0;
  for (let i = 0; i < numDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDate(d);
    const dayLog = dailyLogs[dateStr];
    if (dayLog) {
      total += Object.values(dayLog).reduce((sum, h) => sum + h.xpEarned, 0);
    }
  }
  return total;
}

export function getWeeklyXP(dailyLogs: DailyLogs): number {
  return getXPForDays(dailyLogs, 7);
}

export function getMonthlyXP(dailyLogs: DailyLogs): number {
  return getXPForDays(dailyLogs, 30);
}

/**
 * Bir habit'in streak'ini dailyLogs üzerinden hesapla (bugünden geriye).
 * scheduleDays verilirse planlı olmayan günler atlanır (streak kırılmaz).
 */
export function computeHabitStreak(
  habitId: string,
  dailyLogs: DailyLogs,
  includeToday: boolean,
  scheduleDays?: number[],
): number {
  const today = new Date();
  let streak = 0;
  const startOffset = includeToday ? 0 : 1;
  // Sonsuz döngüden kaçınmak için maks 365 gün geriye bak
  const maxLookback = 365;

  for (let i = startOffset; i < startOffset + maxLookback; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dayOfWeek = d.getDay();

    // Bu gün planlı değilse atla (streak kırılmaz)
    if (scheduleDays && !scheduleDays.includes(dayOfWeek)) {
      continue;
    }

    const dateStr = formatDate(d);
    const dayLog = dailyLogs[dateStr];
    if (dayLog && dayLog[habitId]?.completed) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Bir habit'in başarı oranını hesapla (son 30 gün).
 * scheduleDays verilirse sadece planlı günler sayılır.
 */
export function computeHabitSuccessRate(
  habitId: string,
  dailyLogs: DailyLogs,
  scheduleDays?: number[],
): number {
  const today = new Date();
  let completedDays = 0;
  let totalDays = 0;

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    // Planlı olmayan günleri atla
    if (scheduleDays && !scheduleDays.includes(d.getDay())) {
      continue;
    }

    const dateStr = formatDate(d);
    const dayLog = dailyLogs[dateStr];
    if (dayLog && habitId in dayLog) {
      totalDays++;
      if (dayLog[habitId].completed) completedDays++;
    } else if (scheduleDays) {
      // Planlı gün ama log yok → tamamlanmamış say
      totalDays++;
    }
  }
  return totalDays === 0 ? 0 : Math.round((completedDays / totalDays) * 100);
}
