import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FontSize, BorderRadius, Spacing } from '../constants/theme';

type Step = 'email' | 'otp';

type AuthScreenProps = {
  onClose?: () => void;
};

export default function AuthScreen({ onClose }: AuthScreenProps) {
  const { signInWithOtp, verifyOtp } = useAuth();
  const { colors } = useTheme();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Hata', 'Gecerli bir e-posta adresi girin.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithOtp(trimmed);
    setLoading(false);
    if (error) {
      Alert.alert('Hata', error);
    } else {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    const trimmed = otpCode.trim();
    if (trimmed.length < 6) {
      Alert.alert('Hata', 'Lutfen 6 haneli kodu girin.');
      return;
    }
    setLoading(true);
    const { error } = await verifyOtp(email.trim().toLowerCase(), trimmed);
    setLoading(false);
    if (error) {
      Alert.alert('Hata', error);
    }
    // On success, AuthContext will update user automatically
  };

  return (
    <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.container}>
      {onClose && (
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.inner}
      >
        <Text style={styles.logo}>{"🎯"}</Text>
        <Text style={styles.title}>Habit Quest</Text>
        <Text style={styles.subtitle}>
          {step === 'email'
            ? 'E-posta adresinle giris yap'
            : `${email} adresine kod gonderdik`}
        </Text>

        {step === 'email' ? (
          <>
            <TextInput
              style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }]}
              placeholder="E-posta"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Kod Gonder</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              style={[styles.input, { backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }]}
              placeholder="6 haneli kod"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="number-pad"
              autoCapitalize="none"
              maxLength={6}
              value={otpCode}
              onChangeText={setOtpCode}
              editable={!loading}
            />
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Giris Yap</Text>
              )}
            </Pressable>
            <Pressable onPress={() => { setStep('email'); setOtpCode(''); }} style={styles.backLink}>
              <Text style={styles.backText}>Farkli e-posta kullan</Text>
            </Pressable>
          </>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: Spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logo: {
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
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.lg,
    marginBottom: Spacing.md,
    textAlign: 'center',
    letterSpacing: 1,
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
  backLink: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  backText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.md,
    textDecorationLine: 'underline',
  },
});
