import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { FontSize, BorderRadius, Spacing, shadow } from '../constants/theme';
import { useHabits } from '../context/HabitContext';
import { useTheme } from '../context/ThemeContext';
import { useFriends } from '../context/FriendContext';
import { LEADERBOARD_DATA, LeaderboardEntry } from '../utils/sampleData';
import { getWeeklyXP, getMonthlyXP } from '../utils/stats';
import Screen from '../components/ui/Screen';
import { getAvatarImage } from '../utils/avatarHelper';

type TimeTab = 'weekly' | 'monthly';
type ScopeTab = 'general' | 'friends' | 'me';

// ── Animated XP value component ──
function AnimatedXP({ value, color }: { value: number; color: string }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.25,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          speed: 14,
          bounciness: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [value]);

  return (
    <Animated.Text style={[styles.xpValue, { color, transform: [{ scale: scaleAnim }] }]}>
      {value}
    </Animated.Text>
  );
}

export default function LeaderboardScreen() {
  const [timeTab, setTimeTab] = useState<TimeTab>('weekly');
  const [scopeTab, setScopeTab] = useState<ScopeTab>('general');
  const { profile, habits, dailyLogs } = useHabits();
  const { colors, isDark } = useTheme();
  const { friends } = useFriends();

  // XP boost trigger for testing animation
  const [testBoost, setTestBoost] = useState(0);

  const userWeeklyXP = useMemo(() => getWeeklyXP(dailyLogs) + testBoost, [dailyLogs, testBoost]);
  const userMonthlyXP = useMemo(() => getMonthlyXP(dailyLogs) + testBoost * 4, [dailyLogs, testBoost]);
  const longestStreak = Math.max(...habits.map((h) => h.streak), 0);

  // Friend name set for quick lookup
  const friendNames = useMemo(() => new Set(friends.map((f) => f.name)), [friends]);

  // Build full data with user's live values injected
  const allData: LeaderboardEntry[] = useMemo(() => {
    return LEADERBOARD_DATA.map((entry) => {
      if (entry.name === 'Bartu') {
        return {
          ...entry,
          avatar: getAvatarImage(profile.avatar),
          level: profile.level,
          xp: profile.totalXP + testBoost,
          weeklyXp: userWeeklyXP,
          monthlyXp: userMonthlyXP,
          streak: longestStreak,
        };
      }
      // Mark friends dynamically from FriendContext
      return {
        ...entry,
        isFriend: entry.isFriend || friendNames.has(entry.name),
      };
    });
  }, [profile, userWeeklyXP, userMonthlyXP, longestStreak, friendNames, testBoost]);

  // Get sort value based on time tab
  const getSortXp = useCallback(
    (e: LeaderboardEntry) => (timeTab === 'weekly' ? e.weeklyXp : e.monthlyXp),
    [timeTab],
  );

  // Filtered + sorted data
  const displayData: LeaderboardEntry[] = useMemo(() => {
    let filtered: LeaderboardEntry[];
    switch (scopeTab) {
      case 'friends':
        filtered = allData.filter((e) => e.isFriend || e.name === 'Bartu');
        break;
      case 'me':
        filtered = allData.filter((e) => e.name === 'Bartu');
        break;
      default:
        filtered = allData;
    }
    return [...filtered].sort((a, b) => getSortXp(b) - getSortXp(a));
  }, [allData, scopeTab, getSortXp]);

  // "Haftanin Yukseleni": highest weeklyXp
  const weeklyRiser = useMemo(() => {
    let best: LeaderboardEntry | null = null;
    for (const e of allData) {
      if (!best || e.weeklyXp > best.weeklyXp) best = e;
    }
    return best;
  }, [allData]);

  // User rank in current scope
  const userRankInGeneral = useMemo(() => {
    const sorted = [...allData].sort((a, b) => getSortXp(b) - getSortXp(a));
    return sorted.findIndex((e) => e.name === 'Bartu') + 1;
  }, [allData, getSortXp]);

  const medalColors = [colors.gold, colors.silver, colors.bronze];

  const scopeTabs: { key: ScopeTab; label: string }[] = [
    { key: 'general', label: 'Genel' },
    { key: 'friends', label: 'Arkadaslar' },
    { key: 'me', label: 'Benim Siram' },
  ];

  return (
    <Screen noPadding>
      <Text style={[styles.title, { color: colors.text }]}>Liderlik Tablosu</Text>

      {/* ── Scope Filter (3-way) ── */}
      <View style={[styles.scopeRow, { backgroundColor: colors.surface }, !isDark && [shadow(2), { borderColor: colors.border, borderWidth: 1 }]]}>
        {scopeTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.scopeTab, scopeTab === tab.key && { backgroundColor: colors.primary }]}
            onPress={() => setScopeTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.scopeTabText,
                { color: colors.mutedText },
                scopeTab === tab.key && { color: '#ffffff' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Time Tab (weekly/monthly) ── */}
      <View style={[styles.tabRow, { backgroundColor: colors.surface }]}>
        {(['weekly', 'monthly'] as TimeTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, timeTab === tab && { backgroundColor: colors.primary }]}
            onPress={() => setTimeTab(tab)}
          >
            <Text style={[styles.tabText, { color: colors.mutedText }, timeTab === tab && { color: '#ffffff' }]}>
              {tab === 'weekly' ? 'Haftalik' : 'Aylik'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Haftanin Yukseleni Card ── */}
        {weeklyRiser && scopeTab !== 'me' && (
          <View
            style={[
              styles.riserCard,
              { backgroundColor: colors.card },
              !isDark && [shadow(3), { borderColor: colors.border, borderWidth: 1 }],
            ]}
          >
            <View style={styles.riserLeft}>
              <Text style={styles.riserIcon}>🚀</Text>
              <View>
                <Text style={[styles.riserLabel, { color: colors.mutedText }]}>Haftanin Yukseleni</Text>
                <Text style={[styles.riserName, { color: colors.text }]}>{weeklyRiser.avatar} {weeklyRiser.name}</Text>
              </View>
            </View>
            <View style={styles.riserRight}>
              <Text style={[styles.riserXp, { color: colors.warning }]}>{weeklyRiser.weeklyXp}</Text>
              <Text style={[styles.riserXpLabel, { color: colors.mutedText }]}>XP/hafta</Text>
            </View>
          </View>
        )}

        {/* ── "Benim Siram" summary ── */}
        {scopeTab === 'me' && (
          <View
            style={[
              styles.meSummary,
              { backgroundColor: colors.card },
              !isDark && [shadow(3), { borderColor: colors.border, borderWidth: 1 }],
            ]}
          >
            <Text style={[styles.meAvatar]}>{getAvatarImage(profile.avatar)}</Text>
            <Text style={[styles.meName, { color: colors.text }]}>{profile.name}</Text>
            <View style={styles.meStatsRow}>
              <View style={styles.meStat}>
                <Text style={[styles.meStatValue, { color: colors.primary }]}>#{userRankInGeneral}</Text>
                <Text style={[styles.meStatLabel, { color: colors.mutedText }]}>Siralama</Text>
              </View>
              <View style={[styles.meDivider, { backgroundColor: colors.border }]} />
              <View style={styles.meStat}>
                <Text style={[styles.meStatValue, { color: colors.warning }]}>{userWeeklyXP}</Text>
                <Text style={[styles.meStatLabel, { color: colors.mutedText }]}>Haftalik XP</Text>
              </View>
              <View style={[styles.meDivider, { backgroundColor: colors.border }]} />
              <View style={styles.meStat}>
                <Text style={[styles.meStatValue, { color: colors.success }]}>{longestStreak}</Text>
                <Text style={[styles.meStatLabel, { color: colors.mutedText }]}>Seri</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Leaderboard Rows ── */}
        {displayData.map((entry, index) => {
          const isCurrentUser = entry.name === 'Bartu';
          const displayXp = getSortXp(entry);
          return (
            <View
              key={entry.id}
              style={[
                styles.row,
                { backgroundColor: colors.surface },
                !isDark && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
                isCurrentUser && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            >
              <View style={styles.rankContainer}>
                {index < 3 ? (
                  <View style={[styles.medal, { backgroundColor: medalColors[index] }]}>
                    <Text style={styles.medalText}>{index + 1}</Text>
                  </View>
                ) : (
                  <Text style={[styles.rank, { color: colors.secondaryText }]}>{index + 1}</Text>
                )}
              </View>
              <Text style={styles.avatar}>{entry.avatar}</Text>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }, isCurrentUser && { color: colors.primary }]}>
                  {entry.name} {isCurrentUser ? '(Sen)' : ''}
                </Text>
                <Text style={[styles.detail, { color: colors.secondaryText }]}>
                  Seviye {entry.level} | 🔥 {entry.streak} gun
                </Text>
              </View>
              <View style={styles.xpContainer}>
                <AnimatedXP value={displayXp} color={colors.secondary} />
                <Text style={[styles.xpLabel, { color: colors.mutedText }]}>XP</Text>
              </View>
            </View>
          );
        })}

        {/* ── Test Trigger Button ── */}
        <TouchableOpacity
          style={[styles.testBtn, { backgroundColor: colors.primaryMuted }]}
          onPress={() => setTestBoost((b) => b + 50)}
          activeOpacity={0.7}
        >
          <Text style={[styles.testBtnText, { color: colors.primary }]}>
            Test: +50 XP ({testBoost > 0 ? `+${testBoost} eklendi` : 'animasyonu test et'})
          </Text>
        </TouchableOpacity>

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
    marginBottom: Spacing.sm,
  },

  /* ── Scope Filter ── */
  scopeRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
  },
  scopeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  scopeTabText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  /* ── Time Tabs ── */
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.full,
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },

  /* ── Riser Card ── */
  riserCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  riserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  riserIcon: {
    fontSize: FontSize.xxl,
  },
  riserLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  riserName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  riserRight: {
    alignItems: 'flex-end',
  },
  riserXp: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  riserXpLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },

  /* ── Me Summary ── */
  meSummary: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  meAvatar: {
    fontSize: FontSize.title,
    marginBottom: Spacing.xs,
  },
  meName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  meStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meStat: {
    flex: 1,
    alignItems: 'center',
  },
  meStatValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  meStatLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  meDivider: {
    width: 1,
    height: Spacing.xl,
  },

  /* ── Rows ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  medal: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medalText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  rank: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  avatar: {
    fontSize: FontSize.xxl,
    marginRight: Spacing.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  detail: {
    fontSize: FontSize.xs,
  },
  xpContainer: {
    alignItems: 'center',
  },
  xpValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  xpLabel: {
    fontSize: FontSize.xs,
  },

  /* ── Test Button ── */
  testBtn: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  testBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
