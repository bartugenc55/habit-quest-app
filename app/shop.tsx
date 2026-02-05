import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FontSize, BorderRadius, Spacing, shadow } from '../constants/theme';
import { useHabits } from '../context/HabitContext';
import { useTheme } from '../context/ThemeContext';
import { ShopCategory, ShopItem, SHOP_ITEMS } from '../utils/sampleData';
import { isBoostActive } from '../utils/xp';
import { useSubscription } from '../context/SubscriptionContext';
import { getAvatarDef, RARITY_COLORS, type AvatarDef } from '../constants/avatars';
import Screen from '../components/ui/Screen';
import NotificationBanner from '../components/NotificationBanner';

const PREMIUM_THEME_IDS = ['theme_ocean', 'theme_forest', 'theme_sunset'];

function getBoostTimeRemaining(until: string | null | undefined): string | null {
  if (!until) return null;
  const diff = new Date(until).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}sa ${mins}dk`;
  return `${mins}dk`;
}

const CATEGORIES: { key: ShopCategory; label: string; icon: string }[] = [
  { key: 'appearances', label: 'Gorunumler', icon: '🎨' },
  { key: 'powerups', label: 'Guclendirmeler', icon: '⚡' },
  { key: 'prestige', label: 'Prestij', icon: '👑' },
];

function isOwned(item: ShopItem, inventory: any): boolean {
  if (!inventory) return false;
  switch (item.type) {
    case 'avatar': return inventory.avatars?.includes(item.id) ?? false;
    case 'theme': return inventory.themes?.includes(item.id) ?? false;
    case 'title': return inventory.titles?.includes(item.id) ?? false;
    case 'specialBadge': return inventory.specialBadges?.includes(item.id) ?? false;
    default: return false;
  }
}

function ShopItemCard({
  item,
  owned,
  canAfford,
  onPurchase,
  colors,
  isDark,
  locked,
  onLock,
  onPreview,
  activeLabel,
}: {
  item: ShopItem;
  owned: boolean;
  canAfford: boolean;
  onPurchase: () => boolean;
  colors: any;
  isDark: boolean;
  locked?: boolean;
  onLock?: () => void;
  onPreview?: () => void;
  activeLabel?: string | null;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;
  const [justPurchased, setJustPurchased] = useState(false);

  const handlePress = useCallback(() => {
    if (owned || justPurchased) return;

    if (!canAfford) {
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      return;
    }

    const success = onPurchase();
    if (success !== false) {
      setJustPurchased(true);
      // Scale spring + check pop
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.08, speed: 40, bounciness: 12, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, speed: 20, bounciness: 8, useNativeDriver: true }),
      ]).start();
      Animated.spring(checkAnim, { toValue: 1, speed: 14, bounciness: 16, useNativeDriver: true }).start();
    }
  }, [owned, canAfford, onPurchase, justPurchased]);

  const isDisabled = owned || justPurchased;
  const showOwned = owned || justPurchased;

  return (
    <Animated.View
      style={[
        styles.itemCard,
        {
          backgroundColor: colors.card,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
          borderWidth: 1,
          transform: [{ scale: scaleAnim }, { translateX: shakeAnim }],
        },
        !isDark && shadow(4),
      ]}
    >
      <Pressable style={styles.itemTop} onPress={onPreview} disabled={!onPreview}>
        <View style={[styles.itemIconWrap, { backgroundColor: colors.primaryMuted }]}>
          <Text style={styles.itemIcon}>{item.icon}</Text>
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.itemDesc, { color: colors.mutedText }]} numberOfLines={2}>{item.description}</Text>
          {item.duration && <Text style={[styles.itemDuration, { color: colors.secondaryText }]}>⏱ {item.duration}</Text>}
          {onPreview && <Text style={[styles.previewHint, { color: colors.primary }]}>Onizleme icin dokun</Text>}
        </View>
      </Pressable>

      <View style={styles.itemBottom}>
        <View style={styles.priceTag}>
          <Text style={styles.priceIcon}>💰</Text>
          <Text style={[styles.priceText, { color: colors.warning }]}>{item.price} XP</Text>
        </View>

        {locked ? (
          <Pressable
            style={[styles.lockBadge, { backgroundColor: colors.warning + '20' }]}
            onPress={onLock}
          >
            <Text style={[styles.lockText, { color: colors.warning }]}>🔒 Premium</Text>
          </Pressable>
        ) : activeLabel ? (
          <View style={[styles.ownedBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.ownedText, { color: colors.primary }]}>Aktif: {activeLabel}</Text>
          </View>
        ) : showOwned ? (
          <Animated.View style={[styles.ownedBadge, { backgroundColor: colors.success + '20', transform: [{ scale: justPurchased ? checkAnim : 1 }] }]}>
            <Text style={[styles.ownedText, { color: colors.success }]}>Sahipsin ✓</Text>
          </Animated.View>
        ) : (
          <Pressable
            style={[
              styles.buyBtn,
              { backgroundColor: canAfford ? colors.primary : colors.surface },
              !canAfford && { opacity: 0.5 },
            ]}
            onPress={handlePress}
          >
            <Text style={[styles.buyBtnText, { color: canAfford ? '#ffffff' : colors.mutedText }]}>
              Satin Al
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export default function ShopScreen() {
  const { profile, purchaseItem } = useHabits();
  const { colors, isDark } = useTheme();
  const { isPremium } = useSubscription();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('appearances');
  const [banner, setBanner] = useState({ visible: false, message: '', icon: '' });
  const [previewAvatar, setPreviewAvatar] = useState<AvatarDef | null>(null);

  const xpBalance = profile.xpBalance ?? 0;
  const filteredItems = SHOP_ITEMS.filter((item) => item.category === activeCategory);

  // Active boost checks
  const boosterActive = isBoostActive(profile.activeEffects?.xpBoosterUntil);
  const chestLuckActive = isBoostActive(profile.activeEffects?.chestLuckUntil);
  const comboBoostActive = isBoostActive(profile.activeEffects?.comboBoostUntil);

  const getActiveLabel = useCallback((item: ShopItem): string | null => {
    switch (item.type) {
      case 'xpBooster': return getBoostTimeRemaining(profile.activeEffects?.xpBoosterUntil);
      case 'chestLuck': return getBoostTimeRemaining(profile.activeEffects?.chestLuckUntil);
      case 'comboBoost': return getBoostTimeRemaining(profile.activeEffects?.comboBoostUntil);
      default: return null;
    }
  }, [profile.activeEffects]);

  const handlePurchase = useCallback((item: ShopItem) => {
    const success = purchaseItem(item.id);
    if (success) {
      setBanner({
        visible: true,
        message: `${item.icon} ${item.name} satin alindi!`,
        icon: '🎉',
      });
    } else {
      setBanner({
        visible: true,
        message: 'Yetersiz XP bakiyesi!',
        icon: '😔',
      });
    }
    return success;
  }, [purchaseItem]);

  const cardBase = (extra?: object) => [
    {
      backgroundColor: colors.card,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      borderWidth: 1,
    },
    !isDark && shadow(4),
    extra,
  ];

  return (
    <Screen noPadding>
      <NotificationBanner
        message={banner.message}
        icon={banner.icon}
        visible={banner.visible}
        onHide={() => setBanner((b) => ({ ...b, visible: false }))}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={isDark
            ? [colors.gradientStart, colors.gradientEnd]
            : ['#7c6cf0', '#a89afe', '#c4bcff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <Text style={styles.headerTitle}>XP Magazasi</Text>
          <Text style={styles.headerSubtitle}>XP harcayarak oduller kazan</Text>

          {/* Balance card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceIcon}>💰</Text>
            <View>
              <Text style={styles.balanceLabel}>XP Bakiyen</Text>
              <Text style={styles.balanceAmount}>{xpBalance} XP</Text>
            </View>
          </View>

          {/* Active effects */}
          {boosterActive && (
            <View style={styles.boosterChip}>
              <Text style={styles.boosterChipText}>⚡ XP Booster Aktif</Text>
            </View>
          )}
          {(profile.inventory?.streakFreezes ?? 0) > 0 && (
            <View style={[styles.boosterChip, { marginTop: Spacing.xs }]}>
              <Text style={styles.boosterChipText}>🛡️ Seri Koruyucu: {profile.inventory.streakFreezes}</Text>
            </View>
          )}
          {chestLuckActive && (
            <View style={[styles.boosterChip, { marginTop: Spacing.xs }]}>
              <Text style={styles.boosterChipText}>🍀 Sans Artirici Aktif</Text>
            </View>
          )}
          {comboBoostActive && (
            <View style={[styles.boosterChip, { marginTop: Spacing.xs }]}>
              <Text style={styles.boosterChipText}>🔥 Kombo Boost Aktif</Text>
            </View>
          )}
        </LinearGradient>

        {/* Category Tabs */}
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: activeCategory === cat.key ? colors.primary : colors.surface,
                  borderColor: isDark ? 'transparent' : colors.border,
                  borderWidth: isDark ? 0 : 1,
                },
                activeCategory !== cat.key && !isDark && shadow(2),
              ]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryLabel,
                  { color: activeCategory === cat.key ? '#ffffff' : colors.text },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Items */}
        <View style={styles.itemsContainer}>
          {filteredItems.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              owned={isOwned(item, profile.inventory)}
              canAfford={xpBalance >= item.price}
              onPurchase={() => handlePurchase(item)}
              colors={colors}
              isDark={isDark}
              locked={!isPremium && PREMIUM_THEME_IDS.includes(item.id)}
              onLock={() => router.push('/paywall')}
              activeLabel={getActiveLabel(item)}
              onPreview={item.type === 'avatar' ? () => {
                const def = getAvatarDef(item.id);
                if (def) setPreviewAvatar(def);
              } : undefined}
            />
          ))}
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Avatar Preview Modal ── */}
      {previewAvatar && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewAvatar(null)}>
          <Pressable style={[styles.previewOverlay, { backgroundColor: colors.overlay }]} onPress={() => setPreviewAvatar(null)}>
            <Pressable style={[styles.previewCard, { backgroundColor: colors.surface }]} onPress={() => {}}>
              {/* Rarity ribbon */}
              {(() => {
                const rs = RARITY_COLORS[previewAvatar.rarity];
                return (
                  <View style={[styles.previewRarityRibbon, { backgroundColor: rs.bg }]}>
                    <Text style={[styles.previewRarityText, { color: rs.text }]}>{rs.label}</Text>
                  </View>
                );
              })()}

              {/* Big avatar */}
              <View style={[
                styles.previewAvatarWrap,
                {
                  backgroundColor: colors.primaryMuted,
                  shadowColor: RARITY_COLORS[previewAvatar.rarity].glow,
                  shadowOpacity: previewAvatar.rarity === 'common' ? 0 : 0.6,
                  shadowRadius: 16,
                  elevation: 8,
                },
              ]}>
                <Text style={styles.previewAvatarIcon}>{previewAvatar.icon}</Text>
              </View>

              <Text style={[styles.previewName, { color: colors.text }]}>{previewAvatar.name}</Text>
              <Text style={[styles.previewDesc, { color: colors.secondaryText }]}>{previewAvatar.description}</Text>

              {/* Action button */}
              {(() => {
                const owned = profile.inventory?.avatars?.includes(previewAvatar.id) ?? false;
                const levelUnlocked = (profile.levelUnlockedAvatars ?? []).includes(previewAvatar.id);

                if (owned || levelUnlocked) {
                  return (
                    <View style={[styles.previewBtn, { backgroundColor: colors.success + '20' }]}>
                      <Text style={[styles.previewBtnText, { color: colors.success }]}>Sahipsin ✓</Text>
                    </View>
                  );
                }
                if (previewAvatar.unlockLevel !== null) {
                  return (
                    <View style={[styles.previewBtn, { backgroundColor: colors.warning + '20' }]}>
                      <Text style={[styles.previewBtnText, { color: colors.warning }]}>
                        🔓 Seviye {previewAvatar.unlockLevel}
                      </Text>
                    </View>
                  );
                }
                if (previewAvatar.price !== null) {
                  const canBuy = xpBalance >= previewAvatar.price;
                  return (
                    <Pressable
                      style={[
                        styles.previewBtn,
                        { backgroundColor: canBuy ? colors.primary : colors.surface, opacity: canBuy ? 1 : 0.5 },
                      ]}
                      onPress={() => {
                        if (!canBuy) return;
                        const success = handlePurchase(SHOP_ITEMS.find((s) => s.id === previewAvatar.id)!);
                        if (success) setPreviewAvatar(null);
                      }}
                    >
                      <Text style={[styles.previewBtnText, { color: canBuy ? '#ffffff' : colors.mutedText }]}>
                        💰 {previewAvatar.price} XP — Satin Al
                      </Text>
                    </Pressable>
                  );
                }
                return null;
              })()}

              <Pressable style={styles.previewClose} onPress={() => setPreviewAvatar(null)}>
                <Text style={[styles.previewCloseText, { color: colors.secondaryText }]}>Kapat</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* Header */
  headerGradient: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.header,
    borderBottomRightRadius: BorderRadius.header,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: FontSize.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.md,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  balanceIcon: {
    fontSize: FontSize.xxl,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: FontSize.xl,
    fontWeight: '800',
  },
  boosterChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  boosterChipText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  /* Categories */
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  categoryIcon: {
    fontSize: FontSize.md,
  },
  categoryLabel: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  /* Items */
  itemsContainer: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  itemCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  itemIconWrap: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: FontSize.xxl,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  itemDesc: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  itemDuration: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  itemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  priceIcon: {
    fontSize: FontSize.lg,
  },
  priceText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  buyBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  buyBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  ownedBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  ownedText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  lockBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  lockText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  previewHint: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },

  /* Preview Modal */
  previewOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCard: {
    width: '80%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...shadow(8),
  },
  previewRarityRibbon: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  previewRarityText: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewAvatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    shadowOffset: { width: 0, height: 0 },
  },
  previewAvatarIcon: {
    fontSize: 52,
  },
  previewName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  previewDesc: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  previewBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
    minWidth: 200,
    alignItems: 'center',
  },
  previewBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  previewClose: {
    paddingVertical: Spacing.sm,
  },
  previewCloseText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
