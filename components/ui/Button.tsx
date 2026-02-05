import React, { useRef } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Spacing, FontSize } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  small?: boolean;
}

export default function Button({ title, onPress, variant = 'primary', disabled, style, textStyle, small }: ButtonProps) {
  const { colors } = useTheme();

  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.98, speed: 50, bounciness: 4, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.85, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, speed: 14, bounciness: 10, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const bgMap: Record<Variant, string> = {
    primary: colors.primary,
    secondary: colors.primaryMuted,
    ghost: 'transparent',
  };

  const textColorMap: Record<Variant, string> = {
    primary: '#ffffff',
    secondary: colors.primary,
    ghost: colors.primary,
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.base,
          small && styles.small,
          { backgroundColor: bgMap[variant], opacity, transform: [{ scale }] },
          disabled && styles.disabled,
          style,
        ]}
      >
        <Text style={[
          styles.text,
          small && styles.smallText,
          { color: textColorMap[variant] },
          textStyle,
        ]}>
          {title}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.sm,
  },
  text: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  smallText: {
    fontSize: FontSize.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});
