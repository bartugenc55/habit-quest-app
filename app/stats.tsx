import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { FontSize, BorderRadius, Spacing, shadow } from '../constants/theme';
import { useHabits } from '../context/HabitContext';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { getWeeklyCompletion, getCompletionForDate, computeHabitSuccessRate } from '../utils/stats';
import { xpRequiredForLevel, xpProgressPercent } from '../utils/xp';
import Screen from '../components/ui/Screen';

const DAY_NAMES = ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt'];

function getLast7Days(): { date: string; dayNum: number; dayOfWeek: number; isToday: boolean }[] {
  const today = new Date();
  const result: { date: string; dayNum: number; dayOfWeek: number; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push({
      date: d.toISOString().split('T')[0],
      dayNum: d.getDate(),
      dayOfWeek: d.getDay(),
      isToday: i === 0,
    });
  }
  return result;
}

export default function StatsScreen() {
  const { habits, profile, dailyLogs } = useHabits();
  const { colors, isDark } = useTheme();
  const { isPremium } = useSubscription();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayCompleted = habits.filter((h) => h.completedToday).length;
  const longestStreak = Math.max(...habits.map((h) => h.streak), 0);
  const totalCompletedAllTime = Object.values(dailyLogs).reduce(
    (sum, dayLog) => sum + Object.values(dayLog).filter((h) => h.completed).length,
    todayCompleted,
  );
  const xpNeeded = xpRequiredForLevel(profile.level);
  const xpPercent = xpProgressPercent(profile.currentXP, profile.level);

  const weekly = getWeeklyCompletion(dailyLogs, habits.length);
  const maxRate = Math.max(...weekly.rates, 1);

  const last7 = useMemo(() => getLast7Days(), []);

  // Detail for selected date
  const selectedDetail = useMemo(() => {
    if (!selectedDate) return null;
    const dayLog = dailyLogs[selectedDate];
    const total = habits.length;
    const completed = dayLog
      ? Object.values(dayLog).filter((h) => h.completed).length
      : 0;
    const rate = getCompletionForDate(selectedDate, dailyLogs, total);
    return { completed, total, rate };
  }, [selectedDate, dailyLogs, habits.length]);

  const cardStyle = [
    { backgroundColor: colors.surface },
    !isDark && [shadow(2), { borderColor: colors.border, borderWidth: 1 }],
  ];

  return (
    <Screen noPadding>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Istatistikler</Text>

        <View style={[styles.levelCard, ...cardStyle]}>
          <View style={styles.levelHeader}>
            <Text style={[styles.levelLabel, { color: colors.primary }]}>Seviye {profile.level}</Text>
            <Text style={[styles.levelXP, { color: colors.secondaryText }]}>{profile.currentXP} / {xpNeeded} XP</Text>
          </View>
          <View style={[styles.xpBarBg, { backgroundColor: colors.xpBarBg }]}>
            <View style={[styles.xpBarFill, { width: `${xpPercent}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        <View style={styles.summaryRow}>
          {[
            { icon: '⚡', value: profile.totalXP, label: 'Toplam XP' },
            { icon: '🔥', value: longestStreak, label: 'En Uzun Seri' },
            { icon: '✅', value: todayCompleted, label: 'Bugun' },
            { icon: '🏅', value: totalCompletedAllTime, label: 'Toplam' },
          ].map((item) => (
            <View key={item.label} style={[styles.summaryCard, ...cardStyle]}>
              <Text style={styles.summaryIcon}>{item.icon}</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{item.value}</Text>
              <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Calendar Strip (last 7 days) ── */}
        <View style={{ position: 'relative' }}>
          <View style={!isPremium ? { opacity: 0.3 } : undefined} pointerEvents={isPremium ? 'auto' : 'none'}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Son 7 Gun</Text>
            <View style={[styles.calendarStrip, ...cardStyle]}>
              {last7.map((day) => {
                const rate = getCompletionForDate(day.date, dailyLogs, habits.length);
                const isSelected = selectedDate === day.date;
                const barColor = rate >= 80 ? colors.success : rate >= 50 ? colors.warning : rate > 0 ? colors.danger : colors.xpBarBg;
                return (
                  <Pressable
                    key={day.date}
                    onPress={() => setSelectedDate(isSelected ? null : day.date)}
                    style={[
                      styles.calDay,
                      isSelected && { backgroundColor: colors.primaryMuted, borderRadius: BorderRadius.md },
                      day.isToday && !isSelected && { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: BorderRadius.md },
                    ]}
                  >
                    <Text style={[styles.calDayLetter, { color: colors.mutedText }]}>
                      {DAY_NAMES[day.dayOfWeek]}
                    </Text>
                    <Text style={[
                      styles.calDayNum,
                      { color: day.isToday ? colors.primary : colors.text },
                      day.isToday && { fontWeight: '800' },
                    ]}>
                      {day.dayNum}
                    </Text>
                    <View style={[styles.calBarBg, { backgroundColor: colors.xpBarBg }]}>
                      <View
                        style={[
                          styles.calBarFill,
                          { height: `${Math.max(rate, 4)}%`, backgroundColor: barColor },
                        ]}
                      />
                    </View>
                    <Text style={[styles.calRate, { color: colors.secondaryText }]}>
                      {rate}%
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Detail popover for selected day */}
            {selectedDate && selectedDetail && (
              <View style={[styles.calDetail, ...cardStyle]}>
                <Text style={[styles.calDetailTitle, { color: colors.text }]}>
                  {selectedDate}
                </Text>
                <Text style={[styles.calDetailText, { color: colors.secondaryText }]}>
                  {selectedDetail.completed}/{selectedDetail.total} gorev tamamlandi ({selectedDetail.rate}%)
                </Text>
              </View>
            )}
          </View>
          {!isPremium && (
            <Pressable style={styles.premiumOverlay} onPress={() => router.push('/paywall')}>
              <View style={[styles.premiumBadge, { backgroundColor: colors.warning + '30' }]}>
                <Text style={{ fontSize: FontSize.xl }}>🔒</Text>
                <Text style={[styles.premiumLockText, { color: colors.warning }]}>Premium</Text>
              </View>
            </Pressable>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Haftalik Tamamlanma</Text>
        <View style={[styles.chartContainer, ...cardStyle]}>
          {weekly.days.map((day, i) => {
            const rate = weekly.rates[i];
            const height = Math.max((rate / maxRate) * 120, 4);
            return (
              <View key={day + i} style={styles.barColumn}>
                <Text style={[styles.barRate, { color: colors.secondaryText }]}>{rate}%</Text>
                <View style={[styles.barBg, { backgroundColor: colors.xpBarBg }]}>
                  <View
                    style={[
                      styles.barFill,
                      { height },
                      rate >= 80 && { backgroundColor: colors.success },
                      rate >= 50 && rate < 80 && { backgroundColor: colors.warning },
                      rate < 50 && { backgroundColor: colors.danger },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.secondaryText }]}>{day}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ position: 'relative' }}>
          <View style={!isPremium ? { opacity: 0.3 } : undefined} pointerEvents={isPremium ? 'auto' : 'none'}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Aliskanlik Basarilari</Text>
            {habits.map((habit) => {
              const successRate = computeHabitSuccessRate(habit.id, dailyLogs, habit.scheduleDays);
              return (
                <View key={habit.id} style={[styles.habitStatRow, ...cardStyle]}>
                  <Text style={styles.habitIcon}>{habit.icon}</Text>
                  <View style={styles.habitStatInfo}>
                    <View style={styles.habitStatHeader}>
                      <Text style={[styles.habitName, { color: colors.text }]}>{habit.name}</Text>
                      <Text style={[styles.habitPercent, { color: colors.secondary }]}>{successRate}%</Text>
                    </View>
                    <View style={[styles.progressBg, { backgroundColor: colors.xpBarBg }]}>
                      <View style={[styles.progressFill, { width: `${successRate}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={[styles.habitDetail, { color: colors.mutedText }]}>
                      Seri: {habit.streak} gun | Bugun: {habit.current}/{habit.target} {habit.unit}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
          {!isPremium && (
            <Pressable style={styles.premiumOverlay} onPress={() => router.push('/paywall')}>
              <View style={[styles.premiumBadge, { backgroundColor: colors.warning + '30' }]}>
                <Text style={{ fontSize: FontSize.xl }}>🔒</Text>
                <Text style={[styles.premiumLockText, { color: colors.warning }]}>Premium</Text>
              </View>
            </Pressable>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  levelCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  levelLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  levelXP: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  xpBarBg: {
    height: 10,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: FontSize.xxl,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: FontSize.xs,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },

  /* ── Calendar Strip ── */
  calendarStrip: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  calDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  calDayLetter: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  calDayNum: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  calBarBg: {
    width: Spacing.sm,
    height: Spacing.xl,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  calBarFill: {
    width: '100%',
    borderRadius: BorderRadius.sm,
    minHeight: 2,
  },
  calRate: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
  calDetail: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  calDetailTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  calDetailText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },

  /* ── Chart ── */
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.lg,
    height: 200,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barRate: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.xs,
  },
  barBg: {
    width: 24,
    height: 120,
    borderRadius: BorderRadius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: BorderRadius.sm,
  },
  barLabel: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  habitStatRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  habitIcon: {
    fontSize: FontSize.xxl,
    marginRight: Spacing.sm,
  },
  habitStatInfo: {
    flex: 1,
  },
  habitStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  habitName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  habitPercent: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  progressBg: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  habitDetail: {
    fontSize: FontSize.xs,
  },

  /* ── Premium Lock Overlay ── */
  premiumOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  premiumLockText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
