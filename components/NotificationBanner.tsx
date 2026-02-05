import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { FontSize, BorderRadius, Spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

interface NotificationBannerProps {
  message: string;
  icon: string;
  visible: boolean;
  onHide: () => void;
}

export default function NotificationBanner({ message, icon, visible, onHide }: NotificationBannerProps) {
  const { colors } = useTheme();
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onHide());
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, { opacity, backgroundColor: colors.primary }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 50,
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  icon: {
    fontSize: FontSize.xl,
    marginRight: Spacing.sm,
  },
  message: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
  },
});
