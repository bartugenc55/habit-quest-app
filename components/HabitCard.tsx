import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Easing } from 'react-native';
import { FontSize, BorderRadius, Spacing, shadow } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Habit } from '../utils/sampleData';
import * as Haptics from 'expo-haptics';
import { calculateStreakMultiplier } from '../utils/xp';
import { playSuccessSound } from '../utils/sound';

interface HabitCardProps {
  habit: Habit;
  onIncrement: () => void;
  onDecrement?: () => void;
  onEdit?: () => void;
  embedded?: boolean;
  /** Stagger delay for entrance animation (ms). */
  delay?: number;
  /** Fired when this habit just leveled up. */
  habitLevelUp?: { newLevel: number } | null;
  onHabitLevelUpDismiss?: () => void;
  soundEnabled?: boolean;
}

export default function HabitCard({ habit, onIncrement, onDecrement, onEdit, embedded, delay = 0, habitLevelUp, onHabitLevelUpDismiss, soundEnabled = true }: HabitCardProps) {
  const { colors, isDark } = useTheme();
  const progress = Math.min((habit.current / habit.target) * 100, 100);
  const multiplier = calculateStreakMultiplier(habit.streak);
  const displayXP = habit.xpReward * multiplier;
  const done = habit.completedToday;

  // ── Entrance fade + slide ──
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 400,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Progress bar animation ──
  const barAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: progress,
      duration: 600,
      delay: delay + 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  // ── Button scale + opacity on press ──
  const btnScale = useRef(new Animated.Value(1)).current;
  const btnOpacity = useRef(new Animated.Value(1)).current;
  const onBtnPressIn = () => {
    Animated.parallel([
      Animated.spring(btnScale, { toValue: 0.96, speed: 50, bounciness: 4, useNativeDriver: true }),
      Animated.timing(btnOpacity, { toValue: 0.85, duration: 100, useNativeDriver: true }),
    ]).start();
  };
  const onBtnPressOut = () => {
    Animated.parallel([
      Animated.spring(btnScale, { toValue: 1, speed: 14, bounciness: 10, useNativeDriver: true }),
      Animated.timing(btnOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  // ── Completion animations (fade + slide-down + check pop) ──
  const doneOpacity = useRef(new Animated.Value(done ? 0.55 : 1)).current;
  const doneSlide = useRef(new Animated.Value(done ? 6 : 0)).current;
  const checkScale = useRef(new Animated.Value(done ? 1 : 0)).current;
  const checkRotate = useRef(new Animated.Value(done ? 1 : 0)).current;
  const xpFloatOpacity = useRef(new Animated.Value(0)).current;
  const xpFloatY = useRef(new Animated.Value(0)).current;
  const prevDone = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (soundEnabled) playSuccessSound();

      // Floating +XP rises and fades out
      xpFloatOpacity.setValue(1);
      xpFloatY.setValue(0);
      Animated.parallel([
        Animated.timing(xpFloatOpacity, {
          toValue: 0,
          duration: 800,
          delay: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(xpFloatY, {
          toValue: -24,
          duration: 800,
          delay: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Card fades + slides down
      Animated.parallel([
        Animated.timing(doneOpacity, {
          toValue: 0.55,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(doneSlide, {
          toValue: 6,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Checkmark pops in with rotation + pop
        Animated.sequence([
          Animated.delay(100),
          Animated.parallel([
            Animated.sequence([
              Animated.spring(checkScale, {
                toValue: 1.12,
                speed: 12,
                bounciness: 4,
                useNativeDriver: true,
              }),
              Animated.spring(checkScale, {
                toValue: 1,
                speed: 14,
                bounciness: 10,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(checkRotate, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.back(1.5)),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start();
    } else if (!done && prevDone.current) {
      // Reset if habit is un-completed
      doneOpacity.setValue(1);
      doneSlide.setValue(0);
      checkScale.setValue(0);
      checkRotate.setValue(0);
      xpFloatOpacity.setValue(0);
      xpFloatY.setValue(0);
    }
    prevDone.current = done;
  }, [done]);

  const checkRotateInterp = checkRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '0deg'],
  });

  // ── Habit level-up animation ──
  const lvlScale = useRef(new Animated.Value(1)).current;
  const lvlBadgeOpacity = useRef(new Animated.Value(0)).current;
  const lvlBadgeTranslateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!habitLevelUp) return;

    // Scale pulse: 1 → 1.08 → 1
    Animated.sequence([
      Animated.timing(lvlScale, {
        toValue: 1.08,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lvlScale, {
        toValue: 1,
        duration: 250,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Badge popup: fade in + slide up, then auto-dismiss
    Animated.sequence([
      Animated.parallel([
        Animated.timing(lvlBadgeOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(lvlBadgeTranslateY, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1800),
      Animated.timing(lvlBadgeOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      lvlBadgeTranslateY.setValue(8);
      onHabitLevelUpDismiss?.();
    });
  }, [habitLevelUp]);

  // ── Styles ──
  const outerStyle = embedded
    ? [styles.cardEmbedded]
    : [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
          borderWidth: 1,
        },
        !isDark && shadow(4),
      ];

  // Icon tint color based on habit icon for variety
  const iconBgColor = done ? colors.success + '20' : colors.primaryMuted;
  const iconBorderColor = done ? colors.success + '30' : colors.primary + '18';

  return (
    <Animated.View style={[
      {
        opacity: Animated.multiply(entrance, doneOpacity),
        transform: [
          { scale: lvlScale },
          { translateY: Animated.add(
            entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
            doneSlide,
          )},
        ],
      },
    ]}>
      {/* Habit level-up badge popup */}
      {habitLevelUp && (
        <Animated.View style={[
          styles.lvlBadge,
          {
            backgroundColor: colors.primary,
            opacity: lvlBadgeOpacity,
            transform: [{ translateY: lvlBadgeTranslateY }],
          },
        ]}>
          <Text style={styles.lvlBadgeText}>⭐ Seviye {habitLevelUp.newLevel} oldu!</Text>
        </Animated.View>
      )}
      <Pressable
        style={outerStyle}
        onPress={done ? undefined : onIncrement}
        disabled={done}
      >
        <View style={styles.row}>
          {/* ── Left: Colored icon area ── */}
          <View style={[
            styles.iconWrap,
            { backgroundColor: iconBgColor, borderColor: iconBorderColor },
          ]}>
            <Text style={styles.icon}>{habit.icon}</Text>
          </View>

          {/* ── Center: Title + meta ── */}
          <View style={styles.mid}>
            <View style={styles.nameRow}>
              <Text
                style={[
                  styles.name,
                  { color: colors.text },
                  done && styles.nameDone,
                ]}
                numberOfLines={1}
              >
                {habit.name}
              </Text>
              {onEdit && (
                <Pressable onPress={onEdit} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={[styles.editIcon, { color: colors.mutedText }]}>✎</Text>
                </Pressable>
              )}
            </View>
            <Text style={[styles.habitLevelText, { color: colors.mutedText }]}>
              Lv. {habit.level}  |  {habit.habitXp}/{habit.xpToNextLevel}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.progressText, { color: colors.secondaryText }]}>
                {habit.current}/{habit.target} {habit.unit}
              </Text>
              {habit.streak > 0 && (
                <View style={[styles.streakPill, { backgroundColor: colors.warning + '18' }]}>
                  <Text style={[styles.streakText, { color: colors.streak }]}>
                    🔥 {habit.streak}
                  </Text>
                </View>
              )}
              {multiplier > 1 && (
                <View style={[styles.multPill, { backgroundColor: colors.warning + '14' }]}>
                  <Text style={[styles.multText, { color: colors.warning }]}>x{multiplier}</Text>
                </View>
              )}
            </View>

            {/* Progress bar */}
            <View style={[styles.barBg, { backgroundColor: colors.xpBarBg }]}>
              <Animated.View
                style={[
                  styles.barFill,
                  {
                    width: barWidth,
                    backgroundColor: done ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>

            {/* XP label */}
            <View style={styles.xpLabelWrap}>
              <Text style={[styles.xp, { color: colors.secondaryText }]}>
                +{displayXP} XP
              </Text>
              <Animated.Text style={[
                styles.xpFloat,
                {
                  color: colors.success,
                  opacity: xpFloatOpacity,
                  transform: [{ translateY: xpFloatY }],
                },
              ]}>
                +{displayXP} XP
              </Animated.Text>
            </View>
          </View>

          {/* ── Right: Action buttons ── */}
          <View style={styles.actionCol}>
            {done ? (
              <>
                <Animated.View style={[
                  styles.checkCircle,
                  {
                    backgroundColor: colors.success,
                    transform: [
                      { scale: checkScale },
                      { rotate: checkRotateInterp },
                    ],
                  },
                ]}>
                  <Text style={styles.checkText}>✓</Text>
                </Animated.View>
                <Text style={[styles.doneLabel, { color: colors.success }]}>Tamamlandi</Text>
              </>
            ) : (
              <View style={styles.actionRow}>
                {onDecrement && habit.current > 0 && (
                  <Pressable
                    onPress={onDecrement}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <View style={[styles.smallBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                      <Text style={[styles.smallBtnText, { color: colors.secondaryText }]}>−</Text>
                    </View>
                  </Pressable>
                )}
                <Pressable
                  onPress={onIncrement}
                  onPressIn={onBtnPressIn}
                  onPressOut={onBtnPressOut}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Animated.View style={[
                    styles.addBtn,
                    { backgroundColor: colors.primary, opacity: btnOpacity, transform: [{ scale: btnScale }] },
                  ]}>
                    <Text style={styles.addBtnText}>+</Text>
                  </Animated.View>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  cardEmbedded: {
    paddingVertical: Spacing.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* ── Icon ── */
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    borderWidth: 1.5,
  },
  icon: {
    fontSize: FontSize.xl,
  },

  /* ── Center ── */
  mid: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    lineHeight: 21,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  editIcon: {
    fontSize: FontSize.md,
    opacity: 0.6,
  },
  nameDone: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  habitLevelText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  progressText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  streakPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  streakText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  multPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  multText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
  },

  /* ── Progress bar ── */
  barBg: {
    height: 5,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },

  /* ── XP ── */
  xpLabelWrap: {
    marginTop: Spacing.xs,
  },
  xp: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  xpFloat: {
    position: 'absolute',
    left: 0,
    top: 0,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },

  /* ── Right column ── */
  actionCol: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  /* ── Check circle ── */
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkText: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  doneLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },

  /* ── Add / Subtract buttons ── */
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginTop: -1,
  },
  smallBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginTop: -1,
  },

  /* ── Habit level-up badge ── */
  lvlBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    zIndex: 10,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  lvlBadgeText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
});
