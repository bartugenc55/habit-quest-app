import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Spacing, FontSize } from '../../constants/theme';

interface ChipProps {
  icon?: string;
  label: string;
  color?: string;
}

export default function Chip({ icon, label, color }: ChipProps) {
  const { colors } = useTheme();
  const chipColor = color ?? colors.primary;

  return (
    <View style={[styles.chip, { backgroundColor: chipColor + '20' }]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.label, { color: chipColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
  },
  icon: {
    fontSize: FontSize.sm,
    marginRight: 4,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});
