import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
  Animated,
  Pressable,
  Easing,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FontSize, BorderRadius, Spacing, shadow } from '../constants/theme';
import { useHabits } from '../context/HabitContext';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { xpRequiredForLevel, xpProgressPercent, calculateComboMultiplier, isBoostActive } from '../utils/xp';
import { getRarityColor, getRarityLabel } from '../utils/dailyChest';
import { getAvatarImage } from '../utils/avatarHelper';
import { generateDailyCoachMessage, getCachedCoachMessage, cacheCoachMessage } from '../utils/aiCoach';
import HabitCard from '../components/HabitCard';
import NotificationBanner from '../components/NotificationBanner';
import LevelUpModal from '../components/LevelUpModal';
import Snackbar from '../components/ui/Snackbar';
import Screen from '../components/ui/Screen';

type FilterMode = 'all' | 'incomplete' | 'completed';
type ScheduleView = 'today' | 'all';

export default function HomeScreen() {
  const {
    habits, profile, incrementHabit, decrementHabit, isLoading, levelUpInfo, pendingBadges, dismissLevelUp,
    dailyChestAvailable, claimDailyChest, comboCount, streakFreezeUsed, dismissStreakFreezeNotice,
    habitLevelUpInfo, dismissHabitLevelUp, bonusXP, dismissBonusXP,
    pendingShield, applyShield, declineShield,
    dailyQuest, questJustCompleted, dismissQuestComplete,
  } = useHabits();
  const { colors, isDark } = useTheme();
  const { isPremium } = useSubscription();
  const router = useRouter();
  const [banner, setBanner] = useState({ visible: false, message: '', icon: '' });
  const [filter, setFilter] = useState<FilterMode>('all');
  const [scheduleView, setScheduleView] = useState<ScheduleView>('today');
  const [snackbar, setSnackbar] = useState({ visible: false, habitId: '' });
  const todayWeekday = new Date().getDay();
  const [coachMessage, setCoachMessage] = useState('');

  const activeHabits = useMemo(() => habits.filter((h) => !h.isArchived), [habits]);
  const totalStreak = Math.max(...activeHabits.map((h) => h.streak), 0);
  const completedCount = activeHabits.filter((h) => h.completedToday).length;
  const xpNeeded = xpRequiredForLevel(profile.level);
  const xpPercent = xpProgressPercent(profile.currentXP, profile.level);

  const boosterActive = isBoostActive(profile.activeEffects?.xpBoosterUntil);

  const comboMultiplier = calculateComboMultiplier(comboCount);

  // ── AI Coach message (once per day) ──
  useEffect(() => {
    if (isLoading) return;
    (async () => {
      const cached = await getCachedCoachMessage();
      if (cached) {
        setCoachMessage(cached);
      } else {
        const msg = generateDailyCoachMessage({
          completedHabits: completedCount,
          totalHabits: activeHabits.length,
          streak: totalStreak,
        });
        setCoachMessage(msg);
        await cacheCoachMessage(msg);
      }
    })();
  }, [isLoading]);

  // ── Daily chest animation ──
  const chestScale = useRef(new Animated.Value(1)).current;
  const chestGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (dailyChestAvailable && !isLoading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(chestGlow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(chestGlow, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [dailyChestAvailable, isLoading]);

  const handleClaimChest = async () => {
    const reward = await claimDailyChest();
    if (reward) {
      Animated.sequence([
        Animated.spring(chestScale, { toValue: 1.15, speed: 40, bounciness: 12, useNativeDriver: true }),
        Animated.spring(chestScale, { toValue: 1, speed: 20, bounciness: 8, useNativeDriver: true }),
      ]).start();

      const rarityText = getRarityLabel(reward.rarity);
      setBanner({
        visible: true,
        message: `${reward.icon} ${reward.label} kazandin! (${rarityText})`,
        icon: '🎁',
      });
    }
  };

  // ── Streak freeze banner ──
  const [freezeBannerShown, setFreezeBannerShown] = useState(false);
  useEffect(() => {
    if (streakFreezeUsed && !isLoading) {
      setFreezeBannerShown(true);
    }
  }, [streakFreezeUsed, isLoading]);

  // ── XP bar animation ──
  const xpAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(xpAnim, {
      toValue: xpPercent,
      duration: 900,
      delay: 300,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false,
    }).start();
  }, [xpPercent]);

  const xpWidth = xpAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  // ── Section entrance animations ──
  const statsEntrance = useRef(new Animated.Value(0)).current;
  const tasksEntrance = useRef(new Animated.Value(0)).current;
  const fabEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) return;
    Animated.stagger(120, [
      Animated.timing(statsEntrance, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(tasksEntrance, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(fabEntrance, {
        toValue: 1,
        speed: 12,
        bounciness: 14,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isLoading]);

  const makeEntrance = (anim: Animated.Value, slideDistance = 30) => ({
    opacity: anim,
    transform: [{
      translateY: anim.interpolate({
        inputRange: [0, 1],
        outputRange: [slideDistance, 0],
      }),
    }],
  });

  // ── Completion bar animation ──
  const completionAnim = useRef(new Animated.Value(0)).current;
  const completionTarget = activeHabits.length > 0 ? (completedCount / activeHabits.length) * 100 : 0;
  useEffect(() => {
    Animated.timing(completionAnim, {
      toValue: completionTarget,
      duration: 700,
      delay: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [completionTarget]);
  const completionWidth = completionAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  // ── Today's scheduled habits ──
  const todaysHabits = useMemo(
    () => activeHabits.filter((h) => (h.scheduleDays ?? [0,1,2,3,4,5,6]).includes(todayWeekday)),
    [activeHabits, todayWeekday],
  );

  // ── Sorted & filtered habits ──
  const sortedHabits = useMemo(() => {
    let list = scheduleView === 'today' ? [...todaysHabits] : [...activeHabits];
    if (filter === 'incomplete') list = list.filter((h) => !h.completedToday);
    else if (filter === 'completed') list = list.filter((h) => h.completedToday);
    return list.sort((a, b) => {
      if (a.completedToday !== b.completedToday) return a.completedToday ? 1 : -1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
  }, [activeHabits, todaysHabits, filter, scheduleView]);

  // ── FAB press animation ──
  const fabScale = useRef(new Animated.Value(1)).current;
  const fabOpacity = useRef(new Animated.Value(1)).current;
  const onFabPressIn = () => {
    Animated.parallel([
      Animated.spring(fabScale, { toValue: 0.96, speed: 50, bounciness: 4, useNativeDriver: true }),
      Animated.timing(fabOpacity, { toValue: 0.85, duration: 100, useNativeDriver: true }),
    ]).start();
  };
  const onFabPressOut = () => {
    Animated.parallel([
      Animated.spring(fabScale, { toValue: 1, speed: 14, bounciness: 12, useNativeDriver: true }),
      Animated.timing(fabOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const handleIncrement = useCallback((id: string) => {
    const habit = habits.find((h) => h.id === id);
    if (!habit || habit.completedToday) return;

    const willComplete = habit.current + habit.increment >= habit.target;
    incrementHabit(id);

    if (willComplete) {
      setSnackbar({ visible: true, habitId: id });
      setBanner({
        visible: true,
        message: `${habit.icon} ${habit.name} tamamlandi! +${habit.xpReward} XP`,
        icon: '🎉',
      });
    }
  }, [habits, incrementHabit]);

  const handleDecrement = useCallback((id: string) => {
    decrementHabit(id);
  }, [decrementHabit]);

  const handleUndo = useCallback(() => {
    if (snackbar.habitId) {
      decrementHabit(snackbar.habitId);
      setSnackbar({ visible: false, habitId: '' });
    }
  }, [snackbar.habitId, decrementHabit]);

  if (isLoading) {
    return (
      <Screen noPadding>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const cardBase = (extra?: object) => [
    {
      backgroundColor: colors.card,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      borderWidth: 1,
    },
    !isDark && shadow(4),
    extra,
  ];

  return (
    <Screen noPadding>
      <NotificationBanner
        message={banner.message}
        icon={banner.icon}
        visible={banner.visible}
        onHide={() => setBanner((b) => ({ ...b, visible: false }))}
      />
      <NotificationBanner
        message="Seri Koruyucu kullanildi! Streak'in korundu."
        icon="🔥"
        visible={freezeBannerShown}
        onHide={() => { setFreezeBannerShown(false); dismissStreakFreezeNotice(); }}
      />
      <NotificationBanner
        message={`Bonus XP +${bonusXP}!`}
        icon="🎁"
        visible={bonusXP !== null}
        onHide={dismissBonusXP}
      />
      <NotificationBanner
        message={`Gunluk Gorev tamamlandi! +${dailyQuest?.xpReward ?? 0} XP`}
        icon="✨"
        visible={questJustCompleted}
        onHide={dismissQuestComplete}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── Gradient Header ── */}
        <LinearGradient
          colors={isDark
            ? [colors.gradientStart, colors.gradientEnd]
            : ['#7c6cf0', '#a89afe', '#c4bcff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Merhaba,</Text>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{profile.name}</Text>
                {isPremium && (
                  <View style={[styles.proBadge, { backgroundColor: colors.gold }]}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Lv.{profile.level}</Text>
              </View>
              <Pressable
                style={styles.avatarBtn}
                onPress={() => router.push('/profile')}
              >
                <Text style={styles.avatarEmoji}>{getAvatarImage(profile.avatar)}</Text>
              </Pressable>
            </View>
          </View>

          {/* XP bar */}
          <View style={styles.xpWrap}>
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpLabelLeft}>
                {profile.currentXP} / {xpNeeded} XP
              </Text>
              <Text style={styles.xpLabelRight}>Seviye {profile.level + 1}</Text>
            </View>
            <View style={styles.xpBarBg}>
              <Animated.View style={[styles.xpBarFill, { width: xpWidth }]}>
                <LinearGradient
                  colors={['#ffffff', 'rgba(255,255,255,0.6)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          </View>

          <View style={styles.chipRow}>
            {(profile.inventory?.streakFreezes ?? 0) > 0 && (
              <View style={styles.boosterChip}>
                <Text style={styles.boosterChipText}>🛡️ Kalkan x{profile.inventory.streakFreezes}</Text>
              </View>
            )}
            {boosterActive && (
              <View style={styles.boosterChip}>
                <Text style={styles.boosterChipText}>⚡ Booster Aktif (+%20 XP)</Text>
              </View>
            )}
            {comboCount >= 2 && (
              <View style={styles.boosterChip}>
                <Text style={styles.boosterChipText}>🔥 Combo x{comboMultiplier.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* ── Quick Stats Row ── */}
        <Animated.View style={[styles.statsRow, makeEntrance(statsEntrance)]}>
          {[
            { emoji: '🔥', value: totalStreak, label: 'Seri' },
            { emoji: '✅', value: `${completedCount}/${activeHabits.length}`, label: 'Bugun' },
            { emoji: '⚡', value: profile.totalXP, label: 'XP' },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, ...cardBase()]}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedText }]}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── AI Coach Message ── */}
        {coachMessage !== '' && (
          <Animated.View style={[styles.coachCard, ...cardBase(), makeEntrance(statsEntrance)]}>
            <View style={styles.coachIconWrap}>
              <Text style={styles.coachIcon}>🧠</Text>
            </View>
            <View style={styles.coachContent}>
              <Text style={[styles.coachTitle, { color: colors.primary }]}>Habit AI</Text>
              <Text style={[styles.coachText, { color: colors.text }]}>{coachMessage}</Text>
            </View>
          </Animated.View>
        )}

        {/* ── Daily Quest Card ── */}
        {dailyQuest && (
          <Animated.View style={[styles.questCard, ...cardBase(), makeEntrance(statsEntrance)]}>
            <View style={styles.questHeader}>
              <Text style={styles.questEmoji}>{dailyQuest.completed ? '✅' : '⚔️'}</Text>
              <View style={styles.questInfo}>
                <Text style={[styles.questTitle, { color: colors.primary }]}>
                  {dailyQuest.title}
                </Text>
                <Text style={[styles.questDesc, { color: colors.text }]}>
                  {dailyQuest.description}
                </Text>
              </View>
              <View style={[styles.questReward, { backgroundColor: dailyQuest.completed ? colors.success + '20' : colors.warning + '20' }]}>
                <Text style={[styles.questRewardText, { color: dailyQuest.completed ? colors.success : colors.warning }]}>
                  +{dailyQuest.xpReward} XP
                </Text>
              </View>
            </View>
            <View style={[styles.questBarBg, { backgroundColor: colors.xpBarBg }]}>
              <View
                style={[
                  styles.questBarFill,
                  {
                    width: `${Math.min((dailyQuest.progress / dailyQuest.goal) * 100, 100)}%`,
                    backgroundColor: dailyQuest.completed ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.questProgress, { color: colors.mutedText }]}>
              {dailyQuest.progress}/{dailyQuest.goal} {dailyQuest.completed ? '— Tamamlandi!' : ''}
            </Text>
          </Animated.View>
        )}

        {/* ── Daily Chest Card ── */}
        <Animated.View style={[
          styles.chestCard,
          ...cardBase(),
          makeEntrance(statsEntrance),
          dailyChestAvailable && {
            borderColor: '#ff9f0a',
            borderWidth: 2,
          },
          { transform: [{ scale: chestScale }] },
        ]}>
          <Animated.View style={[
            styles.chestIconWrap,
            dailyChestAvailable && {
              opacity: chestGlow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
            },
          ]}>
            <Text style={styles.chestIcon}>{dailyChestAvailable ? '🎁' : '📦'}</Text>
          </Animated.View>
          <View style={styles.chestInfo}>
            <Text style={[styles.chestTitle, { color: colors.text }]}>Gunluk Sandik</Text>
            <Text style={[styles.chestSubtitle, { color: colors.mutedText }]}>
              {dailyChestAvailable ? 'Odulun hazir!' : 'Yarin tekrar gel!'}
            </Text>
          </View>
          <Pressable
            style={[
              styles.chestBtn,
              { backgroundColor: dailyChestAvailable ? colors.warning : colors.surface },
              !dailyChestAvailable && { opacity: 0.5 },
            ]}
            onPress={handleClaimChest}
            disabled={!dailyChestAvailable}
          >
            <Text style={[styles.chestBtnText, { color: dailyChestAvailable ? '#ffffff' : colors.mutedText }]}>
              {dailyChestAvailable ? 'Ac' : '⏳'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* ── Today's Tasks Block ── */}
        <Animated.View style={[styles.tasksBlock, ...cardBase(), makeEntrance(tasksEntrance, 36)]}>
          <View style={[styles.tasksHeader, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(108,92,231,0.06)' }]}>
            <Text style={[styles.tasksTitle, { color: colors.text }]}>
              {scheduleView === 'today' ? 'Bugunku Gorevler' : 'Tum Gorevler'}
            </Text>
            <View style={[styles.tasksBadge, { backgroundColor: colors.primaryMuted }]}>
              <Text style={[styles.tasksBadgeText, { color: colors.primary }]}>
                {completedCount}/{activeHabits.length}
              </Text>
            </View>
          </View>

          {/* Schedule toggle: Bugün / Tümü */}
          <View style={styles.scheduleToggle}>
            {(['today', 'all'] as ScheduleView[]).map((sv) => (
              <Pressable
                key={sv}
                onPress={() => setScheduleView(sv)}
                style={[
                  styles.scheduleBtn,
                  {
                    backgroundColor: scheduleView === sv ? colors.primary : 'transparent',
                    borderColor: scheduleView === sv ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[
                  styles.scheduleBtnText,
                  { color: scheduleView === sv ? '#ffffff' : colors.secondaryText },
                ]}>
                  {sv === 'today' ? 'Bugun' : 'Tumu'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Completion mini-bar (animated) */}
          <View style={[styles.completionBarBg, { backgroundColor: colors.xpBarBg }]}>
            <Animated.View
              style={[
                styles.completionBarFill,
                {
                  width: completionWidth,
                  backgroundColor: completedCount === activeHabits.length && activeHabits.length > 0
                    ? colors.success
                    : colors.primary,
                },
              ]}
            />
          </View>

          {/* Filter chips */}
          {activeHabits.length > 0 && (
            <View style={styles.filterRow}>
              {([
                { key: 'all' as FilterMode, label: 'Tumu' },
                { key: 'incomplete' as FilterMode, label: 'Tamamlanmayan' },
                { key: 'completed' as FilterMode, label: 'Tamamlanan' },
              ]).map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: filter === f.key ? colors.primary : colors.surface,
                      borderColor: filter === f.key ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: filter === f.key ? '#ffffff' : colors.secondaryText },
                  ]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Habit list – sorted & filtered */}
          {sortedHabits.length === 0 ? (
            activeHabits.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Henuz aliskanlik yok
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
                  Gunluk bir aliskanlik ekleyerek yolculuguna basla!
                </Text>
                <Pressable
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/add-habit')}
                >
                  <Text style={styles.emptyBtnText}>+ Yeni Aliskanlik Ekle</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎉</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Bugun icin gorev yok
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
                  Yeni bir aliskanlik ekleyerek gunune renk kat!
                </Text>
                <Pressable
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/add-habit')}
                >
                  <Text style={styles.emptyBtnText}>+ Yeni Aliskanlik Ekle</Text>
                </Pressable>
              </View>
            )
          ) : (
            sortedHabits.map((habit, i) => (
              <React.Fragment key={habit.id}>
                {i > 0 && (
                  <View style={[styles.habitDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border }]} />
                )}
                <HabitCard
                  habit={habit}
                  onIncrement={() => handleIncrement(habit.id)}
                  onDecrement={() => handleDecrement(habit.id)}
                  onEdit={() => router.push({ pathname: '/edit-habit', params: { id: habit.id } })}
                  embedded
                  delay={300 + i * 80}
                  habitLevelUp={habitLevelUpInfo?.habitId === habit.id ? { newLevel: habitLevelUpInfo.newLevel } : null}
                  onHabitLevelUpDismiss={dismissHabitLevelUp}
                  soundEnabled={profile.soundEnabled ?? true}
                />
              </React.Fragment>
            ))
          )}
        </Animated.View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* FAB with scale animation */}
      <Animated.View style={[
        styles.fab,
        { backgroundColor: colors.primary, opacity: fabOpacity, transform: [{ scale: Animated.multiply(fabEntrance, fabScale) }] },
        shadow(10),
      ]}>
        <Pressable
          style={styles.fabInner}
          onPress={() => router.push('/add-habit')}
          onPressIn={onFabPressIn}
          onPressOut={onFabPressOut}
        >
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </Animated.View>

      <Snackbar
        message="Gorev tamamlandi"
        actionLabel="Geri Al"
        visible={snackbar.visible}
        onAction={handleUndo}
        onDismiss={() => setSnackbar({ visible: false, habitId: '' })}
        duration={4000}
      />

      <LevelUpModal
        levelUpInfo={levelUpInfo}
        newBadges={pendingBadges}
        onDismiss={dismissLevelUp}
      />

      {/* ── Streak Shield Confirmation Modal ── */}
      <Modal visible={pendingShield !== null} transparent animationType="fade">
        <View style={styles.shieldOverlay}>
          <View style={[styles.shieldModal, { backgroundColor: colors.card }]}>
            <Text style={styles.shieldIcon}>🛡️</Text>
            <Text style={[styles.shieldTitle, { color: colors.text }]}>Seri Kalkanı Kullan?</Text>
            <Text style={[styles.shieldDesc, { color: colors.secondaryText }]}>
              {pendingShield?.habitsAtRisk.map((h) => `${h.icon} ${h.name} (${h.streak} gun seri)`).join('\n')}
            </Text>
            <Text style={[styles.shieldSubDesc, { color: colors.mutedText }]}>
              Kalkan kullanarak serilerini koruyabilirsin. ({pendingShield?.shieldsAvailable ?? 0} kalkan mevcut)
            </Text>
            <View style={styles.shieldButtons}>
              <Pressable
                style={[styles.shieldBtn, { backgroundColor: colors.primary }]}
                onPress={applyShield}
              >
                <Text style={styles.shieldBtnText}>🛡️ Kalkan Kullan</Text>
              </Pressable>
              <Pressable
                style={[styles.shieldBtn, styles.shieldDeclineBtn, { borderColor: colors.border }]}
                onPress={declineShield}
              >
                <Text style={[styles.shieldDeclineBtnText, { color: colors.secondaryText }]}>Vazgec</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ── Header ── */
  headerGradient: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.header,
    borderBottomRightRadius: BorderRadius.header,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  userName: {
    color: '#ffffff',
    fontSize: FontSize.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  proBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
  },
  proBadgeText: {
    color: '#1c1c1e',
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  levelBadgeText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarEmoji: {
    fontSize: FontSize.xl,
  },

  /* ── XP Bar ── */
  xpWrap: {
    marginTop: Spacing.xs,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  xpLabelLeft: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  xpLabelRight: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  xpBarBg: {
    height: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    minWidth: Spacing.xs,
  },

  /* ── Booster/Combo Chips ── */
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  boosterChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  boosterChipText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  /* ── Stats Row ── */
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: -Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: FontSize.xl,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },

  /* ── Tasks Block ── */
  tasksBlock: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tasksTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  tasksBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  scheduleToggle: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  scheduleBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  scheduleBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  tasksBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  completionBarBg: {
    height: Spacing.xs,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  completionBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  habitDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.sm,
    opacity: 0.4,
  },

  /* ── Empty State ── */
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: FontSize.hero,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    lineHeight: 18,
  },
  emptyBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 4,
    borderRadius: BorderRadius.full,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },

  /* ── AI Coach ── */
  coachCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  coachIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(108,92,231,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachIcon: {
    fontSize: FontSize.xl,
  },
  coachContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  coachTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: Spacing.xs,
  },
  coachText: {
    fontSize: FontSize.md,
    fontWeight: '500',
    lineHeight: 20,
  },

  /* ── Daily Quest ── */
  questCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  questEmoji: {
    fontSize: FontSize.xxl,
    marginRight: Spacing.sm,
  },
  questInfo: {
    flex: 1,
  },
  questTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  questDesc: {
    fontSize: FontSize.md,
    fontWeight: '500',
    marginTop: 2,
  },
  questReward: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  questRewardText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  questBarBg: {
    height: 6,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  questBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  questProgress: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },

  /* ── Daily Chest ── */
  chestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  chestIconWrap: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chestIcon: {
    fontSize: FontSize.xxxl,
  },
  chestInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  chestTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  chestSubtitle: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  chestBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  chestBtnText: {
    fontSize: FontSize.md,
    fontWeight: '800',
  },

  /* ── Shield Modal ── */
  shieldOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  shieldModal: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  shieldIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  shieldTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  shieldDesc: {
    fontSize: FontSize.md,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  shieldSubDesc: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  shieldButtons: {
    width: '100%',
    gap: Spacing.sm,
  },
  shieldBtn: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  shieldBtnText: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  shieldDeclineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  shieldDeclineBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },

  /* ── FAB ── */
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.xl - Spacing.md,
    width: 58,
    height: 58,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fabInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabText: {
    color: '#ffffff',
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginTop: -2,
  },
});
