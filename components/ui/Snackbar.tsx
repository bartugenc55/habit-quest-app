import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Easing } from 'react-native';
import { FontSize, BorderRadius, Spacing } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';

interface SnackbarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export default function Snackbar({
  message,
  actionLabel,
  onAction,
  visible,
  onDismiss,
  duration = 4000,
}: SnackbarProps) {
  const { colors, isDark } = useTheme();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, speed: 14, bounciness: 8, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();

      timer.current = setTimeout(() => {
        dismiss();
      }, duration);

      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    } else {
      translateY.setValue(80);
      opacity.setValue(0);
    }
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 80, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  if (!visible) return null;

  const bgColor = isDark ? '#2d3436' : '#323232';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity, backgroundColor: bgColor }]}>
      <View style={styles.content}>
        <Text style={styles.message} numberOfLines={1}>{message}</Text>
        {actionLabel && onAction && (
          <Pressable
            onPress={() => {
              if (timer.current) clearTimeout(timer.current);
              onAction();
              dismiss();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.action, { color: colors.warning }]}>{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.md,
    zIndex: 999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
  },
  message: {
    flex: 1,
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  action: {
    fontSize: FontSize.md,
    fontWeight: '800',
    marginLeft: Spacing.md,
    textTransform: 'uppercase',
  },
});
