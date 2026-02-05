import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Spacing } from '../../constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export default function Screen({ children, noPadding }: ScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, !noPadding && styles.padded]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: Spacing.md,
  },
});
