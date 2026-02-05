import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontSize, BorderRadius, Spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { xpRequiredForLevel, xpProgressPercent } from '../utils/xp';

interface XPBarProps {
  level: number;
  currentXP: number;
  totalXP: number;
  name: string;
  avatar: string;
}

export default function XPBar({ level, currentXP, totalXP, name, avatar }: XPBarProps) {
  const { colors } = useTheme();
  const needed = xpRequiredForLevel(level);
  const percent = xpProgressPercent(currentXP, level);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.avatar}>{avatar}</Text>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          <Text style={[styles.levelText, { color: colors.secondary }]}>Seviye {level}</Text>
        </View>
        <View style={[styles.xpBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.xpText}>{totalXP} XP</Text>
        </View>
      </View>
      <View style={[styles.barContainer, { backgroundColor: colors.xpBarBg }]}>
        <View style={[styles.barFill, { width: `${percent}%`, backgroundColor: colors.xpBar }]} />
      </View>
      <Text style={[styles.xpDetail, { color: colors.secondaryText }]}>
        {currentXP} / {needed} XP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatar: {
    fontSize: FontSize.xxxl,
    marginRight: Spacing.sm,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  levelText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  xpBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  xpText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  barContainer: {
    height: 10,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  xpDetail: {
    fontSize: FontSize.xs,
    textAlign: 'right',
    marginTop: 2,
  },
});
