import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { FontSize, BorderRadius, Spacing } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Badge } from '../utils/sampleData';
import { LevelUpInfo } from '../context/HabitContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 24;
const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#6C5CE7', '#00CEFF', '#FF9F43', '#2ECC71', '#E056A0'];
const CONFETTI_EMOJIS = ['🎉', '⭐', '✨', '🌟', '🎊', '💫', '🏆'];

interface ConfettiPiece {
  x: number;
  emoji: string;
  color: string;
  delay: number;
  duration: number;
  rotation: number;
}

function useConfetti(visible: boolean, hasLevelUp: boolean) {
  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: CONFETTI_COUNT }, () => ({
      x: Math.random() * SCREEN_WIDTH,
      emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 400,
      duration: 1200 + Math.random() * 800,
      rotation: Math.random() * 360,
    }));
  }, [visible]);

  const anims = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible && hasLevelUp) {
      const animations = anims.map((anim, i) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: pieces[i].duration,
          delay: pieces[i].delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      );
      Animated.parallel(animations).start();
    } else {
      anims.forEach((a) => a.setValue(0));
    }
  }, [visible, hasLevelUp]);

  return { pieces, anims };
}

interface Props {
  levelUpInfo: LevelUpInfo | null;
  newBadges: Badge[];
  onDismiss: () => void;
}

export default function LevelUpModal({ levelUpInfo, newBadges, onDismiss }: Props) {
  const { colors } = useTheme();
  const visible = levelUpInfo != null || newBadges.length > 0;
  const hasLevelUp = levelUpInfo != null;

  // Flash overlay animation
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;

  const { pieces, anims } = useConfetti(visible, hasLevelUp);

  useEffect(() => {
    if (visible && hasLevelUp) {
      // Flash in -> hold -> fade to card
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flashAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            speed: 12,
            bounciness: 8,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(titleAnim, {
          toValue: 1,
          duration: 300,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnim, {
          toValue: 0,
          duration: 600,
          delay: 800,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      flashAnim.setValue(0);
      scaleAnim.setValue(0.5);
      titleAnim.setValue(0);
    }
  }, [visible, hasLevelUp]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>

        {/* Confetti layer */}
        {hasLevelUp && pieces.map((piece, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.confetti,
              {
                left: piece.x,
                opacity: anims[i].interpolate({
                  inputRange: [0, 0.2, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    translateY: anims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-40, SCREEN_HEIGHT + 40],
                    }),
                  },
                  {
                    rotate: anims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${piece.rotation}deg`],
                    }),
                  },
                ],
              },
            ]}
          >
            {piece.emoji}
          </Animated.Text>
        ))}

        {/* Full-screen LEVEL UP flash */}
        {hasLevelUp && (
          <Animated.View
            style={[
              styles.flashOverlay,
              {
                opacity: flashAnim,
              },
            ]}
            pointerEvents="none"
          >
            <Animated.Text
              style={[
                styles.flashText,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: flashAnim,
                },
              ]}
            >
              LEVEL UP!
            </Animated.Text>
          </Animated.View>
        )}

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              opacity: hasLevelUp
                ? titleAnim
                : 1,
              transform: hasLevelUp
                ? [{
                    scale: titleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  }]
                : [],
            },
          ]}
        >
          {levelUpInfo && (
            <>
              <Text style={styles.emoji}>🎉</Text>
              <Text style={[styles.title, { color: colors.text }]}>Seviye Atladin!</Text>
              <Text style={[styles.levelText, { color: colors.primary }]}>
                Seviye {levelUpInfo.oldLevel} → Seviye {levelUpInfo.newLevel}
              </Text>
              <Text style={[styles.xpText, { color: colors.success }]}>+{levelUpInfo.xpGained} XP kazandin</Text>
            </>
          )}

          {newBadges.length > 0 && (
            <View style={levelUpInfo ? [styles.badgeSection, { borderTopColor: colors.border }] : undefined}>
              <Text style={[styles.badgeTitle, { color: colors.text }]}>
                {levelUpInfo ? 'Yeni Rozetler' : 'Rozet Kazandin!'}
              </Text>
              {newBadges.map((badge) => (
                <View key={badge.id} style={[styles.badgeRow, { backgroundColor: colors.card }]}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <View style={styles.badgeInfo}>
                    <Text style={[styles.badgeName, { color: colors.text }]}>{badge.name}</Text>
                    <Text style={[styles.badgeDesc, { color: colors.secondaryText }]}>{badge.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Harika!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  confetti: {
    position: 'absolute',
    fontSize: 20,
    zIndex: 10,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(108, 92, 231, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  flashText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    zIndex: 20,
  },
  emoji: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  levelText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  xpText: {
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  badgeSection: {
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    width: '100%',
  },
  badgeTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  badgeIcon: {
    fontSize: 28,
    marginRight: Spacing.sm,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  badgeDesc: {
    fontSize: FontSize.xs,
  },
  button: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.lg,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
