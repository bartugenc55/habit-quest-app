import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Switch, TouchableOpacity, Alert, Platform, Modal, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { FontSize, BorderRadius, Spacing, shadow } from '../constants/theme';
import { useHabits } from '../context/HabitContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useFriends } from '../context/FriendContext';
import { xpRequiredForLevel } from '../utils/xp';
import { Habit } from '../utils/sampleData';
import BadgeComponent from '../components/Badge';
import Screen from '../components/ui/Screen';
import { requestNotificationPermissions, cancelAllNotifications, scheduleDailyReminder, scheduleAllHabitReminders, cancelAllHabitReminders, registerForPushNotificationsAsync, savePushTokenToSupabase } from '../utils/notifications';
import { saveHabits } from '../utils/storage';
import { useSubscription } from '../context/SubscriptionContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { getAvatarImage } from '../utils/avatarHelper';
import AvatarSelector from '../components/AvatarSelector';
import AuthScreen from '../components/AuthScreen';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'system', label: 'Sistem', icon: '📱' },
  { mode: 'light', label: 'Acik', icon: '☀️' },
  { mode: 'dark', label: 'Koyu', icon: '🌙' },
];

type HabitTab = 'active' | 'archived';

export default function ProfileScreen() {
  const { profile, badges, habits, removeHabit, updateProfile, reorderHabits, archiveHabit, unarchiveHabit, syncNow, isSyncing } = useHabits();
  const { colors, isDark, themeMode, setThemeMode } = useTheme();
  const { myFriendCode, friends, addFriend, removeFriend } = useFriends();
  const { isPremium, buySubscription, restorePurchase } = useSubscription();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const xpNeeded = xpRequiredForLevel(profile.level);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [habitTab, setHabitTab] = useState<HabitTab>('active');
  const [isBuying, setIsBuying] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSavingToken, setIsSavingToken] = useState(false);

  // Auto-close login modal when user successfully signs in
  useEffect(() => {
    if (user && showLoginModal) {
      setShowLoginModal(false);
    }
  }, [user]);

  const activeHabits = useMemo(
    () => [...habits].filter((h) => !h.isArchived).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [habits],
  );
  const archivedHabits = useMemo(
    () => habits.filter((h) => h.isArchived),
    [habits],
  );

  const handleBuyPremium = async () => {
    setIsBuying(true);
    try {
      const success = await buySubscription();
      if (success) {
        Alert.alert('Basarili!', 'Premium aktif edildi.');
      }
    } finally {
      setIsBuying(false);
    }
  };

  const handleRestorePurchase = async () => {
    setIsRestoring(true);
    try {
      const found = await restorePurchase();
      if (found) {
        Alert.alert('Basarili!', 'Premium geri yuklendi.');
      } else {
        Alert.alert('Bulunamadi', 'Aktif abonelik bulunamadi.');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(myFriendCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleAddFriend = () => {
    if (!friendCodeInput.trim()) return;
    const success = addFriend(friendCodeInput);
    if (success) {
      setFriendCodeInput('');
      setShowAddFriend(false);
      Alert.alert('Basarili', 'Arkadas eklendi!');
    } else {
      Alert.alert('Hata', 'Bu kod gecersiz, kendinize ait veya zaten arkadas listenizde.');
    }
  };

  const handleRemoveFriend = (id: string, name: string) => {
    Alert.alert('Arkadasi Sil', `"${name}" arkadasinizi silmek istiyor musunuz?`, [
      { text: 'Iptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => removeFriend(id) },
    ]);
  };

  const pickerDate = new Date();
  pickerDate.setHours(profile.notificationHour ?? 21, profile.notificationMinute ?? 0, 0, 0);

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        const hour = profile.notificationHour ?? 21;
        const minute = profile.notificationMinute ?? 0;
        await scheduleDailyReminder(hour, minute);
        // Schedule per-habit reminders
        const updatedHabits = await scheduleAllHabitReminders(habits);
        await saveHabits(updatedHabits);
        updateProfile({ notificationsEnabled: true });
      } else {
        Alert.alert(
          'Bildirim Izni',
          'Bildirim gondermek icin izin gerekiyor. Lutfen ayarlardan bildirimleri etkinlestirin.',
        );
      }
    } else {
      await cancelAllNotifications();
      // Cancel all per-habit reminders
      await cancelAllHabitReminders(habits);
      const cleared = habits.map((h) => ({ ...h, notificationIds: [] }));
      await saveHabits(cleared);
      updateProfile({ notificationsEnabled: false });
    }
  };

  const handleEnablePushNotifications = async () => {
    if (!user) return;
    setIsSavingToken(true);
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        setIsSavingToken(false);
        return;
      }
      const saved = await savePushTokenToSupabase(user.id, token);
      if (saved) {
        Alert.alert('Basarili', 'Push bildirimleri etkinlestirildi!');
      } else {
        Alert.alert('Hata', 'Token kaydedilirken bir sorun olustu.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Bildirim ayarlanirken bir sorun olustu.');
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleTimeChange = async (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (!selectedDate || _event.type === 'dismissed') return;

    const hour = selectedDate.getHours();
    const minute = selectedDate.getMinutes();

    updateProfile({ notificationHour: hour, notificationMinute: minute });

    if (profile.notificationsEnabled) {
      await scheduleDailyReminder(hour, minute);
    }
  };

  const handleTimePickerDone = () => {
    setShowTimePicker(false);
  };

  const handleRemoveHabit = (id: string, name: string) => {
    Alert.alert(
      'Aliskanlik Silinsin mi?',
      'Bu aliskanlik silinecek ve ilgili ilerleme verileri kaldirilacak. Emin misin?',
      [
        { text: 'Vazgec', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => removeHabit(id) },
      ],
    );
  };

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const formattedTime = `${String(profile.notificationHour ?? 21).padStart(2, '0')}:${String(profile.notificationMinute ?? 0).padStart(2, '0')}`;

  return (
    <Screen noPadding>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.header}
        >
          <Text style={styles.avatar}>{getAvatarImage(profile.avatar)}</Text>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            {isPremium && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.level}>Seviye {profile.level}</Text>
          <View style={styles.xpRow}>
            <Text style={styles.xpText}>{profile.currentXP} / {xpNeeded} XP</Text>
          </View>
          <Text style={styles.totalXP}>Toplam: {profile.totalXP} XP</Text>
          {(profile.inventory?.streakFreezes ?? 0) > 0 && (
            <View style={styles.shieldBadge}>
              <Text style={styles.shieldBadgeText}>🛡️ {profile.inventory.streakFreezes} Kalkan</Text>
            </View>
          )}
        </LinearGradient>

        <AvatarSelector
          ownedAvatars={profile.inventory?.avatars ?? []}
          levelUnlockedAvatars={profile.levelUnlockedAvatars ?? []}
          activeAvatar={profile.avatar}
          onSelect={(avatarId) => updateProfile({ avatar: avatarId })}
        />

        {/* ── Pro / Premium Section ── */}
        {isPremium ? (
          <LinearGradient
            colors={['#f1c40f', '#e67e22']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.proCard}
          >
            <Text style={styles.proActiveIcon}>👑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.proActiveTitle}>Premium Aktif</Text>
              <Text style={styles.proActiveSubtitle}>Tum ozellikler acik!</Text>
            </View>
            <Text style={styles.proActiveCheck}>✅</Text>
          </LinearGradient>
        ) : (
          <View style={[
            styles.proSection,
            { backgroundColor: colors.surface },
            !isDark && [shadow(2), { borderColor: colors.border, borderWidth: 1 }],
          ]}>
            <LinearGradient
              colors={['#f1c40f', '#f39c12', '#e67e22']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.proHeader}
            >
              <Text style={styles.proCrown}>👑</Text>
              <Text style={styles.proTitle}>Habit Quest Premium</Text>
              <Text style={styles.proSubtitle}>Tum ozelliklerin kilidini ac</Text>
            </LinearGradient>

            <View style={styles.proFeatures}>
              {[
                { icon: '♾️', text: 'Sinirsiz aliskanlik ekle' },
                { icon: '🎨', text: 'Ozel premium temalar' },
                { icon: '📊', text: 'Detayli istatistikler' },
                { icon: '🚫', text: 'Reklamsiz deneyim' },
              ].map((f) => (
                <View key={f.text} style={styles.proFeatureRow}>
                  <Text style={styles.proFeatureIcon}>{f.icon}</Text>
                  <Text style={[styles.proFeatureText, { color: colors.text }]}>{f.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.proBuyBtn, isBuying && { opacity: 0.7 }]}
              onPress={handleBuyPremium}
              disabled={isBuying || isRestoring}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#f1c40f', '#e67e22']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.proBuyBtnInner}
              >
                {isBuying ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.proBuyBtnText}>Premium'a Gec</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.proRestoreBtn}
              onPress={handleRestorePurchase}
              disabled={isBuying || isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator color={colors.secondaryText} size="small" />
              ) : (
                <Text style={[styles.proRestoreText, { color: colors.secondaryText }]}>
                  Satin Alimi Geri Yukle
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.statsButton,
            { backgroundColor: colors.surface },
            !isDark && [shadow(2), { borderColor: colors.border, borderWidth: 1 }],
          ]}
          onPress={() => router.push('/stats')}
          activeOpacity={0.7}
        >
          <Text style={styles.statsButtonIcon}>📊</Text>
          <Text style={[styles.statsButtonText, { color: colors.text }]}>Istatistikler & Ilerleme</Text>
          <Text style={[styles.statsButtonArrow, { color: colors.secondaryText }]}>›</Text>
        </TouchableOpacity>

        {/* ── Friend Code Card ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Arkadas Kodun</Text>
        <View style={[
          styles.friendCodeCard,
          { backgroundColor: colors.surface },
          !isDark && [shadow(2), { borderColor: colors.border, borderWidth: 1 }],
        ]}>
          <View style={styles.friendCodeRow}>
            <View style={styles.friendCodeLeft}>
              <Text style={[styles.friendCodeLabel, { color: colors.mutedText }]}>Kodunu paylas, arkadas ekle</Text>
              <Text style={[styles.friendCodeValue, { color: colors.primary }]}>{myFriendCode}</Text>
            </View>
            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: codeCopied ? colors.success : colors.primary }]}
              onPress={handleCopyCode}
              activeOpacity={0.7}
            >
              <Text style={styles.copyBtnText}>{codeCopied ? 'Kopyalandi!' : 'Kopyala'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Friends List ── */}
        <View style={styles.friendsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
            Arkadaslar ({friends.length})
          </Text>
          <TouchableOpacity
            style={[styles.addFriendBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddFriend(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addFriendBtnText}>+ Ekle</Text>
          </TouchableOpacity>
        </View>

        {friends.length === 0 ? (
          <View style={[
            styles.emptyFriends,
            { backgroundColor: colors.surface },
            !isDark && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
          ]}>
            <Text style={[styles.emptyFriendsText, { color: colors.mutedText }]}>
              Henuz arkadas eklemedin. Kodunu paylas!
            </Text>
          </View>
        ) : (
          friends.map((friend) => (
            <View
              key={friend.id}
              style={[
                styles.friendRow,
                { backgroundColor: colors.surface },
                !isDark && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
              ]}
            >
              <Text style={styles.friendAvatar}>{friend.avatar}</Text>
              <View style={styles.friendInfo}>
                <Text style={[styles.friendName, { color: colors.text }]}>{friend.name}</Text>
                <Text style={[styles.friendDetail, { color: colors.secondaryText }]}>
                  Lv.{friend.level} | {friend.streak} gun seri
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveFriend(friend.id, friend.name)}
                style={[styles.deleteBtn, { backgroundColor: colors.danger + '20' }]}
              >
                <Text style={[styles.deleteText, { color: colors.danger }]}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* ── Add Friend Modal ── */}
        <Modal visible={showAddFriend} transparent animationType="slide">
          <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
            <View style={[styles.addFriendModal, { backgroundColor: colors.surface }]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Arkadas Ekle</Text>
                <TouchableOpacity onPress={() => { setShowAddFriend(false); setFriendCodeInput(''); }}>
                  <Text style={[styles.modalDone, { color: colors.primary }]}>Kapat</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.addFriendBody}>
                <Text style={[styles.addFriendDesc, { color: colors.secondaryText }]}>
                  Arkadasinin kodunu gir:
                </Text>
                <TextInput
                  style={[
                    styles.friendCodeInput,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: isDark ? colors.border : colors.border,
                      borderWidth: 1,
                    },
                  ]}
                  placeholder="HQ-XXXX-XXXX"
                  placeholderTextColor={colors.mutedText}
                  value={friendCodeInput}
                  onChangeText={setFriendCodeInput}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={12}
                />
                <Pressable
                  style={[
                    styles.addFriendSubmit,
                    { backgroundColor: friendCodeInput.trim() ? colors.primary : colors.surface },
                    !friendCodeInput.trim() && { opacity: 0.5 },
                  ]}
                  onPress={handleAddFriend}
                  disabled={!friendCodeInput.trim()}
                >
                  <Text style={[
                    styles.addFriendSubmitText,
                    { color: friendCodeInput.trim() ? '#ffffff' : colors.mutedText },
                  ]}>
                    Arkadas Ekle
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Theme Selector */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Gorunum</Text>
        <View style={[
          styles.themeRow,
          { backgroundColor: colors.surface },
          !isDark && [shadow(2), { borderColor: colors.border, borderWidth: 1 }],
        ]}>
          {THEME_OPTIONS.map((opt) => {
            const active = themeMode === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                style={[
                  styles.themeOption,
                  active && { backgroundColor: colors.primary },
                ]}
                onPress={() => setThemeMode(opt.mode)}
                activeOpacity={0.7}
              >
                <Text style={styles.themeIcon}>{opt.icon}</Text>
                <Text style={[
                  styles.themeLabel,
                  { color: active ? '#ffffff' : colors.secondaryText },
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Rozetler ({unlockedCount}/{badges.length})
        </Text>
        <View style={styles.badgeGrid}>
          {badges.map((badge) => (
            <BadgeComponent key={badge.id} badge={badge} />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Aliskanliklar</Text>

        {/* Active / Archived toggle */}
        <View style={[
          styles.habitTabRow,
          { backgroundColor: colors.surface },
          !isDark && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
        ]}>
          {([
            { key: 'active' as HabitTab, label: 'Aktif', count: activeHabits.length },
            { key: 'archived' as HabitTab, label: 'Arsiv', count: archivedHabits.length },
          ]).map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setHabitTab(tab.key)}
              style={[
                styles.habitTabBtn,
                habitTab === tab.key && { backgroundColor: colors.primary },
              ]}
            >
              <Text style={[
                styles.habitTabText,
                { color: habitTab === tab.key ? '#ffffff' : colors.secondaryText },
              ]}>
                {tab.label} ({tab.count})
              </Text>
            </Pressable>
          ))}
        </View>

        {habitTab === 'active' ? (
          activeHabits.length === 0 ? (
            <View style={[
              styles.emptyHabits,
              { backgroundColor: colors.surface },
              !isDark && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
            ]}>
              <Text style={[styles.emptyHabitsText, { color: colors.mutedText }]}>
                Aktif aliskanlik yok.
              </Text>
            </View>
          ) : (
            <View style={styles.draggableContainer}>
              <DraggableFlatList
                data={activeHabits}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                onDragEnd={({ data }) => reorderHabits(data.map((h) => h.id))}
                renderItem={({ item: habit, drag, isActive }: RenderItemParams<Habit>) => (
                  <ScaleDecorator>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onLongPress={drag}
                      disabled={isActive}
                      style={[
                        styles.habitRow,
                        { backgroundColor: isActive ? colors.primaryMuted : colors.surface },
                        !isDark && !isActive && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
                        isActive && { borderColor: colors.primary, borderWidth: 1 },
                      ]}
                    >
                      <Text style={[styles.dragHandle, { color: colors.mutedText }]}>≡</Text>
                      <Text style={styles.habitIcon}>{habit.icon}</Text>
                      <View style={styles.habitInfo}>
                        <Text style={[styles.habitName, { color: colors.text }]}>{habit.name}</Text>
                        <Text style={[styles.habitDetail, { color: colors.secondaryText }]}>
                          Hedef: {habit.target} {habit.unit} | Seri: {habit.streak} gun
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => archiveHabit(habit.id)}
                        style={[styles.actionBtn, { backgroundColor: colors.warning + '20' }]}
                      >
                        <Text style={styles.actionBtnIcon}>📦</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveHabit(habit.id, habit.name)}
                        style={[styles.deleteBtn, { backgroundColor: colors.danger + '20' }]}
                      >
                        <Text style={[styles.deleteText, { color: colors.danger }]}>✕</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </ScaleDecorator>
                )}
              />
            </View>
          )
        ) : (
          archivedHabits.length === 0 ? (
            <View style={[
              styles.emptyHabits,
              { backgroundColor: colors.surface },
              !isDark && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
            ]}>
              <Text style={[styles.emptyHabitsText, { color: colors.mutedText }]}>
                Arsivlenmis aliskanlik yok.
              </Text>
            </View>
          ) : (
            archivedHabits.map((habit) => (
              <View
                key={habit.id}
                style={[
                  styles.habitRow,
                  { backgroundColor: colors.surface },
                  !isDark && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
                ]}
              >
                <Text style={styles.habitIcon}>{habit.icon}</Text>
                <View style={styles.habitInfo}>
                  <Text style={[styles.habitName, { color: colors.text }]}>{habit.name}</Text>
                  <Text style={[styles.habitDetail, { color: colors.secondaryText }]}>
                    Hedef: {habit.target} {habit.unit} | Seri: {habit.streak} gun
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => unarchiveHabit(habit.id)}
                  style={[styles.actionBtn, { backgroundColor: colors.success + '20' }]}
                >
                  <Text style={styles.actionBtnIcon}>↩</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRemoveHabit(habit.id, habit.name)}
                  style={[styles.deleteBtn, { backgroundColor: colors.danger + '20' }]}
                >
                  <Text style={[styles.deleteText, { color: colors.danger }]}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ayarlar</Text>

        <View style={[
          styles.settingRow,
          { backgroundColor: colors.surface },
          !isDark && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
        ]}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Tamamlanma Sesi</Text>
          <Switch
            value={profile.soundEnabled ?? true}
            onValueChange={(v) => updateProfile({ soundEnabled: v })}
            trackColor={{ false: colors.xpBarBg, true: colors.primary }}
            thumbColor={isDark ? colors.text : '#ffffff'}
          />
        </View>

        <View style={[
          styles.settingRow,
          { backgroundColor: colors.surface, marginTop: Spacing.sm },
          !isDark && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
        ]}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Bildirimler</Text>
          <Switch
            value={profile.notificationsEnabled}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: colors.xpBarBg, true: colors.primary }}
            thumbColor={isDark ? colors.text : '#ffffff'}
          />
        </View>

        {profile.notificationsEnabled && (
          <TouchableOpacity
            style={[
              styles.settingRow,
              { backgroundColor: colors.surface, marginTop: Spacing.sm },
              !isDark && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
            ]}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.settingLabel, { color: colors.text }]}>Hatirlatma Saati</Text>
            <View style={[styles.timeBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.timeText}>{formattedTime}</Text>
            </View>
          </TouchableOpacity>
        )}

        {showTimePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={pickerDate}
            mode="time"
            is24Hour
            display="spinner"
            onChange={handleTimeChange}
          />
        )}

        {showTimePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide">
            <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
              <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Hatirlatma Saati</Text>
                  <TouchableOpacity onPress={handleTimePickerDone}>
                    <Text style={[styles.modalDone, { color: colors.primary }]}>Tamam</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickerDate}
                  mode="time"
                  is24Hour
                  display="spinner"
                  onChange={handleTimeChange}
                  style={{ height: 200 }}
                  textColor={colors.text}
                />
              </View>
            </View>
          </Modal>
        )}

        <TouchableOpacity
          style={[
            styles.settingRow,
            { backgroundColor: colors.surface, marginTop: Spacing.sm },
            !isDark && [shadow(1), { borderColor: colors.border, borderWidth: 1 }],
          ]}
          onPress={() => {
            Alert.alert(
              "Onboarding'i Sifirla",
              'Uygulamayi yeniden baslattiginizda onboarding ekrani gosterilecek.',
              [
                { text: 'Iptal', style: 'cancel' },
                {
                  text: 'Sifirla',
                  style: 'destructive',
                  onPress: async () => {
                    await AsyncStorage.removeItem('@hq/hasOnboarded');
                    Alert.alert('Basarili', 'Uygulamayi yeniden baslatin.');
                  },
                },
              ],
            );
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.settingLabel, { color: colors.warning }]}>Onboarding'i Sifirla</Text>
          <Text style={{ fontSize: FontSize.lg }}>🔄</Text>
        </TouchableOpacity>

        {/* ── Cloud Sync ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bulut Senkronizasyon</Text>
        {user ? (
          <>
            <Text style={[styles.syncEmail, { color: colors.secondaryText }]}>
              {user.email}
            </Text>
            <TouchableOpacity
              style={[
                styles.syncButton,
                { backgroundColor: colors.primary },
                isSyncing && { opacity: 0.6 },
              ]}
              onPress={syncNow}
              disabled={isSyncing}
              activeOpacity={0.7}
            >
              <Text style={styles.syncButtonText}>
                {isSyncing ? 'Senkronize ediliyor...' : 'Simdi Senkronize Et'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.syncButton,
                { backgroundColor: colors.primary, marginTop: Spacing.sm },
                isSavingToken && { opacity: 0.6 },
              ]}
              onPress={handleEnablePushNotifications}
              disabled={isSavingToken}
              activeOpacity={0.7}
            >
              <Text style={styles.syncButtonText}>
                {isSavingToken ? 'Token kaydediliyor...' : 'Bildirimleri Ac'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.signOutButton,
                { backgroundColor: colors.danger + '15', borderColor: colors.danger, borderWidth: 1 },
              ]}
              onPress={() => {
                Alert.alert('Cikis Yap', 'Hesabinizdan cikis yapmak istiyor musunuz?', [
                  { text: 'Iptal', style: 'cancel' },
                  { text: 'Cikis Yap', style: 'destructive', onPress: signOut },
                ]);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.signOutText, { color: colors.danger }]}>Cikis Yap</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.syncDesc, { color: colors.secondaryText }]}>
              Verilerini buluta yedeklemek icin giris yap.
            </Text>
            <TouchableOpacity
              style={[styles.syncButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowLoginModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.syncButtonText}>Giris Yap</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Login Modal ── */}
        <Modal visible={showLoginModal} animationType="slide">
          <AuthScreen onClose={() => setShowLoginModal(false)} />
        </Modal>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  avatar: {
    fontSize: FontSize.hero,
    marginBottom: Spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    color: '#ffffff',
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  proBadge: {
    backgroundColor: '#f1c40f',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  proBadgeText: {
    color: '#1a1a2e',
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  level: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.lg,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  xpRow: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  xpText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  totalXP: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  shieldBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },
  shieldBadgeText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  // ── Pro Section ──
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  proActiveIcon: {
    fontSize: FontSize.xxl,
    marginRight: Spacing.sm,
  },
  proActiveTitle: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '800',
  },
  proActiveSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  proActiveCheck: {
    fontSize: FontSize.xxl,
  },
  proSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  proHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  proCrown: {
    fontSize: FontSize.hero - 10,
    marginBottom: Spacing.xs,
  },
  proTitle: {
    color: '#ffffff',
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  proSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  proFeatures: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  proFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  proFeatureIcon: {
    fontSize: FontSize.xl,
    marginRight: Spacing.md,
  },
  proFeatureText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  proBuyBtn: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  proBuyBtnInner: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  proBuyBtnText: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  proRestoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  proRestoreText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  statsButtonIcon: {
    fontSize: FontSize.xl,
    marginRight: Spacing.sm,
  },
  statsButtonText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  statsButtonArrow: {
    fontSize: FontSize.xxl,
    fontWeight: '300',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Theme selector
  themeRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  themeIcon: {
    fontSize: FontSize.lg,
  },
  themeLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },

  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  habitIcon: {
    fontSize: FontSize.xxl,
    marginRight: Spacing.sm,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  habitDetail: {
    fontSize: FontSize.xs,
  },
  deleteBtn: {
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },

  // ── Habit Tabs ──
  habitTabRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  habitTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  habitTabText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  draggableContainer: {
    marginHorizontal: Spacing.md,
  },
  dragHandle: {
    fontSize: FontSize.xl,
    marginRight: Spacing.sm,
    opacity: 0.5,
  },
  actionBtn: {
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs,
  },
  actionBtnIcon: {
    fontSize: FontSize.md,
  },
  emptyHabits: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyHabitsText: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  settingLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  timeBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  timeText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  modalDone: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },

  // ── Friend Code ──
  friendCodeCard: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  friendCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendCodeLeft: {
    flex: 1,
  },
  friendCodeLabel: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  friendCodeValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    letterSpacing: 1,
  },
  copyBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  copyBtnText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  // ── Friends List ──
  friendsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  addFriendBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  addFriendBtnText: {
    color: '#ffffff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  friendAvatar: {
    fontSize: FontSize.xxl,
    marginRight: Spacing.sm,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  friendDetail: {
    fontSize: FontSize.xs,
  },
  emptyFriends: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyFriendsText: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },

  // ── Add Friend Modal ──
  addFriendModal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: Spacing.xl,
  },
  addFriendBody: {
    padding: Spacing.lg,
  },
  addFriendDesc: {
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
  },
  friendCodeInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  addFriendSubmit: {
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  addFriendSubmitText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  syncEmail: {
    fontSize: FontSize.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  syncDesc: {
    fontSize: FontSize.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  syncButton: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  signOutButton: {
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  signOutText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
