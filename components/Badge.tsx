import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { FontSize, BorderRadius, Spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Badge as BadgeType } from '../utils/sampleData';

interface BadgeProps {
  badge: BadgeType;
}

export default function BadgeComponent({ badge }: BadgeProps) {
  const { colors } = useTheme();
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.card }, !badge.unlocked && styles.locked]}
        onPress={() => setShowDetail(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>{badge.unlocked ? badge.icon : '🔒'}</Text>
        <Text style={[styles.name, { color: colors.text }, !badge.unlocked && { color: colors.mutedText }]} numberOfLines={1}>
          {badge.name}
        </Text>
      </TouchableOpacity>

      <Modal visible={showDetail} transparent animationType="fade" onRequestClose={() => setShowDetail(false)}>
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowDetail(false)}
        >
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.card }]}>
            <Text style={styles.detailIcon}>{badge.unlocked ? badge.icon : '🔒'}</Text>
            <Text style={[styles.detailName, { color: colors.text }]}>{badge.name}</Text>
            <Text style={[styles.detailDesc, { color: colors.secondaryText }]}>{badge.description}</Text>
            <Text style={[styles.detailStatus, { color: badge.unlocked ? colors.success : colors.mutedText }]}>
              {badge.unlocked ? 'Kazanildi' : 'Kilitli'}
            </Text>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.card }]}
              onPress={() => setShowDetail(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.closeText, { color: colors.text }]}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    width: 90,
    height: 90,
    margin: Spacing.xs,
  },
  locked: {
    opacity: 0.4,
  },
  icon: {
    fontSize: 32,
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  detailCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '85%',
    alignItems: 'center',
    borderWidth: 1,
  },
  detailIcon: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  detailName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  detailDesc: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  detailStatus: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  closeBtn: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  closeText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
