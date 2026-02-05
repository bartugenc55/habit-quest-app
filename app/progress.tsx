import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, BorderRadius, Spacing, shadow } from '../constants/theme';
import { useHabits } from '../context/HabitContext';
import { useTheme } from '../context/ThemeContext';
import { getCompletionForDate } from '../utils/stats';
import Screen from '../components/ui/Screen';

const DAY_NAMES = ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt'];

function getLast7Days(): { date: string; dayLabel: string; isToday: boolean }[] {
  const today = new Date();
  const result: { date: string; dayLabel: string; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    result.push({
      date: d.toISOString().split('T')[0],
      dayLabel: DAY_NAMES[d.getDay()],
      isToday: i === 0,
    });
  }
  return result;
}

export default function ProgressScreen() {
  const { habits, dailyLogs } = useHabits();
  const { colors, isDark } = useTheme();

  const activeHabits = useMemo(() => habits.filter((h) => !h.isArchived), [habits]);
  const totalHabits = activeHabits.length;
  const longestStreak = Math.max(...activeHabits.map((h) => h.streak), 0);

  const last7 = useMemo(() => getLast7Days(), []);

  // Weekly stats from daily logs
  const weeklyStats = useMemo(() => {
    let totalCompleted = 0;
    let totalPossible = 0;

    for (const day of last7) {
      const dayLog = dailyLogs[day.date];
      const completed = dayLog
        ? Object.values(dayLog).filter((h) => h.completed).length
        : 0;
      // For today, also count live completions
      if (day.isToday) {
        const todayCompleted = activeHabits.filter((h) => h.completedToday).length;
        totalCompleted += Math.max(completed, todayCompleted);
      } else {
        totalCompleted += completed;
      }
      totalPossible += totalHabits;
    }

    const completionRate = totalPossible > 0
      ? Math.round((totalCompleted / totalPossible) * 100)
      : 0;

    return { totalCompleted, totalPossible, completionRate };
  }, [last7, dailyLogs, activeHabits, totalHabits]);

  // Per-day rates for bar chart
  const dayRates = useMemo(() => {
    return last7.map((day) => {
      if (day.isToday) {
        const todayCompleted = activeHabits.filter((h) => h.completedToday).length;
        return totalHabits > 0 ? Math.round((todayCompleted / totalHabits) * 100) : 0;
      }
      return getCompletionForDate(day.date, dailyLogs, totalHabits);
    });
  }, [last7, dailyLogs, totalHabits, activeHabits]);

  const maxRate = Math.max(...dayRates, 1);

  // Bar entrance animation
  const barAnims = useRef(last7.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(
      80,
      barAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ),
    ).start();
  }, []);

  // Section entrance
  const sectionAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(sectionAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const cardBase = (extra?: object) => [
    {
      backgroundColor: colors.card,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      borderWidth: 1,
    },
    !isDark && shadow(4),
    extra,
  ];

  const rateColor = (rate: number) => {
    if (rate >= 80) return colors.success;
    if (rate >= 50) return colors.warning;
    return colors.danger;
  };

  return (
    <Screen noPadding>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Header ── */}
        <LinearGradient
          colors={isDark
            ? [colors.gradientStart, colors.gradientEnd]
            : ['#7c6cf0', '#a89afe', '#c4bcff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>Ilerleme</Text>
          <Text style={styles.headerSubtitle}>Son 7 gunluk performansin</Text>
        </LinearGradient>

        {/* ── Summary Cards ── */}
        <Animated.View style={[
          styles.summaryRow,
          {
            opacity: sectionAnim,
            transform: [{
              translateY: sectionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [24, 0],
              }),
            }],
          },
        ]}>
          {[
            {
              icon: '✅',
              value: weeklyStats.totalCompleted,
              label: 'Haftalik Tamamlanan',
            },
            {
              icon: '📈',
              value: `${weeklyStats.completionRate}%`,
              label: 'Tamamlanma Orani',
            },
            {
              icon: '🔥',
              value: longestStreak,
              label: 'Mevcut Seri',
            },
          ].map((item) => (
            <View key={item.label} style={[styles.summaryCard, ...cardBase()]}>
              <Text style={styles.summaryIcon}>{item.icon}</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{item.value}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedText }]}>{item.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── 7-Day Bar Chart ── */}
        <Animated.View style={[
          styles.chartSection,
          {
            opacity: sectionAnim,
            transform: [{
              translateY: sectionAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [32, 0],
              }),
            }],
          },
        ]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Gunluk Tamamlanma</Text>
          <View style={[styles.chartContainer, ...cardBase()]}>
            {last7.map((day, i) => {
              const rate = dayRates[i];
              const barMaxHeight = 120;
              const targetHeight = Math.max((rate / maxRate) * barMaxHeight, 4);

              const animHeight = barAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [0, targetHeight],
              });

              return (
                <View key={day.date} style={styles.barColumn}>
                  <Text style={[styles.barRate, { color: colors.secondaryText }]}>
                    {rate}%
                  </Text>
                  <View style={[styles.barBg, { backgroundColor: colors.xpBarBg }]}>
                    <Animated.View
                      style={[
                        styles.barFill,
                        {
                          height: animHeight,
                          backgroundColor: rateColor(rate),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.barLabel,
                    { color: day.isToday ? colors.primary : colors.secondaryText },
                    day.isToday && { fontWeight: '800' },
                  ]}>
                    {day.dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Per-Habit Weekly Breakdown ── */}
        <Animated.View style={{
          opacity: sectionAnim,
          transform: [{
            translateY: sectionAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [40, 0],
            }),
          }],
        }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Aliskanlik Bazinda</Text>
          {activeHabits.length === 0 ? (
            <View style={[styles.emptyCard, ...cardBase()]}>
              <Text style={[styles.emptyText, { color: colors.mutedText }]}>
                Henuz aliskanlik eklenmedi.
              </Text>
            </View>
          ) : (
            activeHabits.map((habit) => {
              // Count completions in last 7 days for this habit
              let completedDays = 0;
              let scheduledDays = 0;
              for (const day of last7) {
                const dow = new Date(day.date).getDay();
                const scheduled = (habit.scheduleDays ?? [0, 1, 2, 3, 4, 5, 6]).includes(dow);
                if (!scheduled) continue;
                scheduledDays++;
                if (day.isToday) {
                  if (habit.completedToday) completedDays++;
                } else {
                  const dayLog = dailyLogs[day.date];
                  if (dayLog && dayLog[habit.id]?.completed) completedDays++;
                }
              }
              const habitRate = scheduledDays > 0
                ? Math.round((completedDays / scheduledDays) * 100)
                : 0;

              return (
                <View key={habit.id} style={[styles.habitRow, ...cardBase()]}>
                  <Text style={styles.habitIcon}>{habit.icon}</Text>
                  <View style={styles.habitInfo}>
                    <View style={styles.habitHeader}>
                      <Text style={[styles.habitName, { color: colors.text }]}>{habit.name}</Text>
                      <Text style={[styles.habitRate, { color: rateColor(habitRate) }]}>
                        {completedDays}/{scheduledDays} ({habitRate}%)
                      </Text>
                    </View>
                    <View style={[styles.habitBarBg, { backgroundColor: colors.xpBarBg }]}>
                      <View
                        style={[
                          styles.habitBarFill,
                          {
                            width: `${habitRate}%`,
                            backgroundColor: rateColor(habitRate),
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.habitStreak, { color: colors.mutedText }]}>
                      Seri: {habit.streak} gun
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* ── Header ── */
  headerGradient: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.header,
    borderBottomRightRadius: BorderRadius.header,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: FontSize.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.md,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },

  /* ── Summary ── */
  summaryRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: -Spacing.md,
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: FontSize.xl,
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  /* ── Section ── */
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  chartSection: {},

  /* ── Bar Chart ── */
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    height: 200,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barRate: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  barBg: {
    width: 28,
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
    fontWeight: '600',
    marginTop: Spacing.xs,
  },

  /* ── Per-Habit Breakdown ── */
  habitRow: {
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
  habitInfo: {
    flex: 1,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  habitName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  habitRate: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  habitBarBg: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  habitBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  habitStreak: {
    fontSize: FontSize.xs,
  },

  /* ── Empty ── */
  emptyCard: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
});
