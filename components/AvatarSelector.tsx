import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { getAvatarImage, getAllAvailableAvatars } from '../utils/avatarHelper';
import { getAvatarDef, RARITY_COLORS } from '../constants/avatars';
import { FontSize, Spacing, BorderRadius, shadow } from '../constants/theme';

interface AvatarSelectorProps {
  ownedAvatars: string[];
  levelUnlockedAvatars: string[];
  activeAvatar: string;
  onSelect: (avatarId: string) => void;
}

const NUM_COLUMNS = 3;

export default function AvatarSelector({ ownedAvatars, levelUnlockedAvatars, activeAvatar, onSelect }: AvatarSelectorProps) {
  const { colors, isDark } = useTheme();

  const availableAvatars = getAllAvailableAvatars(ownedAvatars, levelUnlockedAvatars);

  if (availableAvatars.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }, !isDark && { borderColor: colors.border, borderWidth: 1 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Avatar Sec</Text>
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
          Henuz avatarin yok. Magazadan satin al veya seviye atla!
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: string }) => {
    const isActive = item === activeAvatar;
    const def = getAvatarDef(item);
    const rarity = def?.rarity ?? 'common';
    const rarityStyle = RARITY_COLORS[rarity];

    return (
      <TouchableOpacity
        style={[
          styles.avatarItem,
          { backgroundColor: colors.card },
          isActive && {
            borderColor: rarityStyle.glow !== 'transparent' ? rarityStyle.glow : colors.primary,
            borderWidth: 3,
            shadowColor: rarityStyle.glow !== 'transparent' ? rarityStyle.glow : colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 10,
            elevation: 6,
          },
          !isActive && { borderColor: colors.border, borderWidth: 1 },
        ]}
        onPress={() => onSelect(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.avatarEmoji}>{getAvatarImage(item)}</Text>

        {/* Rarity label */}
        <View style={[styles.rarityBadge, { backgroundColor: rarityStyle.bg }]}>
          <Text style={[styles.rarityText, { color: rarityStyle.text }]}>
            {rarityStyle.label}
          </Text>
        </View>

        {isActive && (
          <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.activeBadgeText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, !isDark && { borderColor: colors.border, borderWidth: 1 }]}>
      <Text style={[styles.title, { color: colors.text }]}>Avatar Sec</Text>
      <FlatList
        data={availableAvatars}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        numColumns={NUM_COLUMNS}
        scrollEnabled={false}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const AVATAR_SIZE = 90;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...shadow(2),
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  grid: {
    gap: Spacing.sm,
  },
  row: {
    justifyContent: 'flex-start',
    gap: Spacing.sm,
  },
  avatarItem: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 36,
  },
  rarityBadge: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
    minWidth: 44,
    alignItems: 'center',
  },
  rarityText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
