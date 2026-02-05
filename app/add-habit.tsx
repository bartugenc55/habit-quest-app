import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { FontSize, BorderRadius, Spacing, shadow } from '../constants/theme';
import { useHabits } from '../context/HabitContext';
import { useTheme } from '../context/ThemeContext';
import { HABIT_TEMPLATES, ALL_DAYS, HabitDifficulty } from '../utils/sampleData';
import { getXPForDifficulty } from '../utils/xp';
import { useSubscription } from '../context/SubscriptionContext';
import Screen from '../components/ui/Screen';

const DAY_LABELS = [
  { key: 1, short: 'Pzt' },
  { key: 2, short: 'Sal' },
  { key: 3, short: 'Crs' },
  { key: 4, short: 'Per' },
  { key: 5, short: 'Cum' },
  { key: 6, short: 'Cmt' },
  { key: 0, short: 'Paz' },
];

export default function AddHabitScreen() {
  const { addHabit, habits } = useHabits();
  const { isPremium } = useSubscription();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const [increment, setIncrement] = useState('');
  const [difficulty, setDifficulty] = useState<HabitDifficulty>('medium');
  const [scheduleDays, setScheduleDays] = useState<number[]>(ALL_DAYS);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(9);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const toggleDay = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const selectTemplate = (template: (typeof HABIT_TEMPLATES)[0]) => {
    setName(template.name);
    setIcon(template.icon);
    setTarget(String(template.target));
    setUnit(template.unit);
    setIncrement(String(template.increment));
    setDifficulty(template.difficulty);
    setScheduleDays(template.scheduleDays ?? ALL_DAYS);
  };

  const handleSubmit = () => {
    if (!isPremium && habits.length >= 5) {
      Alert.alert(
        'Limit',
        'Ucretsiz planda en fazla 5 aliskanlik ekleyebilirsin.',
        [
          { text: 'Iptal', style: 'cancel' },
          { text: 'Premium', onPress: () => router.push('/paywall') },
        ],
      );
      return;
    }

    if (!name.trim() || !target || !unit.trim() || !increment) {
      Alert.alert('Hata', 'Lutfen tum zorunlu alanlari doldurun.');
      return;
    }

    addHabit({
      name: name.trim(),
      icon: icon || '🎯',
      target: parseFloat(target),
      unit: unit.trim(),
      increment: parseFloat(increment),
      xpReward: getXPForDifficulty(difficulty),
      difficulty,
      scheduleDays: scheduleDays.length > 0 ? scheduleDays : ALL_DAYS,
      reminderEnabled,
      reminderTime: reminderEnabled ? { hour: reminderHour, minute: reminderMinute } : undefined,
      level: 1,
      habitXp: 0,
      xpToNextLevel: 100,
    });

    router.back();
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surface,
      color: colors.text,
    },
    !isDark && { borderColor: colors.border, borderWidth: 1 },
  ];

  return (
    <Screen noPadding>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.backBtn, { color: colors.secondary }]}>← Geri</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Yeni Aliskanlik</Text>
            <View style={{ width: 60 }} />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hazir Sablonlar</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templateRow}
          >
            {HABIT_TEMPLATES.map((tmpl, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.templateCard,
                  { backgroundColor: colors.surface },
                  name === tmpl.name && { borderColor: colors.primary },
                  !isDark && shadow(1),
                ]}
                onPress={() => selectTemplate(tmpl)}
              >
                <Text style={styles.templateIcon}>{tmpl.icon}</Text>
                <Text style={[styles.templateName, { color: colors.text }]}>{tmpl.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Detaylar</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Ikon</Text>
            <TextInput
              style={inputStyle}
              value={icon}
              onChangeText={setIcon}
              placeholder="🎯"
              placeholderTextColor={colors.mutedText}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Isim *</Text>
            <TextInput
              style={inputStyle}
              value={name}
              onChangeText={setName}
              placeholder="Aliskanlik adi"
              placeholderTextColor={colors.mutedText}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.sm }]}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Hedef *</Text>
              <TextInput
                style={inputStyle}
                value={target}
                onChangeText={setTarget}
                placeholder="10"
                keyboardType="numeric"
                placeholderTextColor={colors.mutedText}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>Birim *</Text>
              <TextInput
                style={inputStyle}
                value={unit}
                onChangeText={setUnit}
                placeholder="dk, km, L..."
                placeholderTextColor={colors.mutedText}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>Artis *</Text>
            <TextInput
              style={inputStyle}
              value={increment}
              onChangeText={setIncrement}
              placeholder="1"
              keyboardType="numeric"
              placeholderTextColor={colors.mutedText}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Zorluk</Text>
          <View style={styles.difficultyRow}>
            {([
              { key: 'easy' as HabitDifficulty, label: 'Kolay', xp: 5 },
              { key: 'medium' as HabitDifficulty, label: 'Orta', xp: 10 },
              { key: 'hard' as HabitDifficulty, label: 'Zor', xp: 20 },
            ]).map((d) => {
              const selected = difficulty === d.key;
              return (
                <TouchableOpacity
                  key={d.key}
                  onPress={() => setDifficulty(d.key)}
                  style={[
                    styles.difficultyChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[
                    styles.difficultyLabel,
                    { color: selected ? '#ffffff' : colors.text },
                  ]}>
                    {d.label}
                  </Text>
                  <Text style={[
                    styles.difficultyXp,
                    { color: selected ? 'rgba(255,255,255,0.7)' : colors.mutedText },
                  ]}>
                    +{d.xp} XP
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hangi gunler?</Text>
          <View style={styles.dayRow}>
            {DAY_LABELS.map(({ key, short }) => {
              const selected = scheduleDays.includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => toggleDay(key)}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.surface,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      { color: selected ? '#ffffff' : colors.secondaryText },
                    ]}
                  >
                    {short}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hatirlatici</Text>
          <View style={[
            styles.reminderRow,
            { backgroundColor: colors.surface },
            !isDark && { borderColor: colors.border, borderWidth: 1 },
          ]}>
            <Text style={[styles.reminderLabel, { color: colors.text }]}>Hatirlatici</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: colors.xpBarBg, true: colors.primary }}
              thumbColor={isDark ? colors.text : '#ffffff'}
            />
          </View>

          {reminderEnabled && (
            <TouchableOpacity
              style={[
                styles.reminderRow,
                { backgroundColor: colors.surface, marginTop: Spacing.sm },
                !isDark && { borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.reminderLabel, { color: colors.text }]}>Saat</Text>
              <View style={[styles.timeBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.timeText}>
                  {String(reminderHour).padStart(2, '0')}:{String(reminderMinute).padStart(2, '0')}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {showTimePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={(() => { const d = new Date(); d.setHours(reminderHour, reminderMinute, 0, 0); return d; })()}
              mode="time"
              is24Hour
              display="spinner"
              onChange={(_e: DateTimePickerEvent, date?: Date) => {
                setShowTimePicker(false);
                if (date && _e.type !== 'dismissed') {
                  setReminderHour(date.getHours());
                  setReminderMinute(date.getMinutes());
                }
              }}
            />
          )}

          {showTimePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="slide">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                  <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Hatirlatma Saati</Text>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={[styles.modalDone, { color: colors.primary }]}>Tamam</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={(() => { const d = new Date(); d.setHours(reminderHour, reminderMinute, 0, 0); return d; })()}
                    mode="time"
                    is24Hour
                    display="spinner"
                    onChange={(_e: DateTimePickerEvent, date?: Date) => {
                      if (date && _e.type !== 'dismissed') {
                        setReminderHour(date.getHours());
                        setReminderMinute(date.getMinutes());
                      }
                    }}
                    style={{ height: 200 }}
                    textColor={colors.text}
                  />
                </View>
              </View>
            </Modal>
          )}

          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
            <Text style={styles.submitText}>Aliskanlik Ekle</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  templateRow: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  templateCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    width: 90,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateIcon: {
    fontSize: FontSize.xxl,
    marginBottom: Spacing.xs,
  },
  templateName: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputGroup: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  input: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  difficultyRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  difficultyChip: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  difficultyLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  difficultyXp: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  dayRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    gap: Spacing.xs,
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  reminderLabel: {
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
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  submitBtn: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
