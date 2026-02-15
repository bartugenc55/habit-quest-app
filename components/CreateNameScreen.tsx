import React, { useState } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { FontSize, BorderRadius, Spacing } from '../constants/theme';
import { loadProfile, saveProfile } from '../utils/storage';
import { DEFAULT_PROFILE } from '../utils/sampleData';

interface Props {
  onNameSet: (name: string) => void;
}

export default function CreateNameScreen({ onNameSet }: Props) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert('Hata', 'Isim en az 2 karakter olmali.');
      return;
    }
    setSaving(true);
    try {
      const existing = await loadProfile();
      const updated = { ...(existing ?? DEFAULT_PROFILE), name: trimmed };
      await saveProfile(updated);
      onNameSet(trimmed);
    } catch {
      Alert.alert('Hata', 'Isim kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <Text style={styles.icon}>👤</Text>
        <Text style={styles.title}>Hos Geldin!</Text>
        <Text style={styles.subtitle}>Seni nasil taniyalim?</Text>
        <TextInput
          style={styles.input}
          placeholder="Ismin"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={20}
          editable={!saving}
        />
        <Pressable
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Devam Et</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  icon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.hero,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    color: '#ffffff',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});
