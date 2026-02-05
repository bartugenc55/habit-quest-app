import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { FontSize, BorderRadius, Spacing, shadow } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import Screen from '../components/ui/Screen';

const FEATURES = [
  { icon: '♾️', text: 'Sinirsiz aliskanlik ekle' },
  { icon: '🎨', text: 'Ozel premium temalar' },
  { icon: '📊', text: 'Detayli istatistikler' },
  { icon: '🚫', text: 'Reklamsiz deneyim' },
];

export default function PaywallScreen() {
  const { colors, isDark } = useTheme();
  const { buySubscription, restorePurchase, isPremium } = useSubscription();
  const router = useRouter();
  const [isBuying, setIsBuying] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleBuy = async () => {
    setIsBuying(true);
    try {
      const success = await buySubscription();
      if (success) {
        Alert.alert('Basarili!', 'Premium aktif edildi.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
      }
    } finally {
      setIsBuying(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const found = await restorePurchase();
      if (found) {
        Alert.alert('Basarili!', 'Premium geri yuklendi.', [
          { text: 'Tamam', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Bulunamadi', 'Aktif abonelik bulunamadi.');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  if (isPremium) {
    return (
      <Screen noPadding>
        <LinearGradient
          colors={['#f1c40f', '#f39c12', '#e67e22']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.title}>Premium Aktif</Text>
          <Text style={styles.subtitle}>Tum ozellikler acik!</Text>
        </LinearGradient>
      </Screen>
    );
  }

  return (
    <Screen noPadding>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#f1c40f', '#f39c12', '#e67e22']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.title}>Habit Quest Premium</Text>
          <Text style={styles.subtitle}>Tum ozelliklerin kilidini ac</Text>
        </LinearGradient>

        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View
              key={f.text}
              style={[
                styles.featureRow,
                { backgroundColor: colors.surface },
                !isDark && [shadow(2), { borderColor: colors.border, borderWidth: 1 }],
              ]}
            >
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.buyBtn, isBuying && { opacity: 0.7 }]}
          onPress={handleBuy}
          disabled={isBuying || isRestoring}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f1c40f', '#e67e22']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyBtnInner}
          >
            {isBuying ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buyBtnText}>Premium'a Gec</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={isBuying || isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator color={colors.secondaryText} size="small" />
          ) : (
            <Text style={[styles.restoreText, { color: colors.secondaryText }]}>
              Satin Alimi Geri Yukle
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.header,
    borderBottomRightRadius: BorderRadius.header,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  backText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  crown: {
    fontSize: FontSize.hero,
    marginBottom: Spacing.sm,
  },
  title: {
    color: '#ffffff',
    fontSize: FontSize.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.md,
    fontWeight: '500',
    marginTop: Spacing.xs,
  },
  featureList: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  featureIcon: {
    fontSize: FontSize.xxl,
    marginRight: Spacing.md,
  },
  featureText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
  },
  buyBtn: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  buyBtnInner: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  buyBtnText: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  restoreText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
