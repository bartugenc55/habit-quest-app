import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Tabs, useRouter, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HabitProvider } from '../context/HabitContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { FriendProvider } from '../context/FriendContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { shadow } from '../constants/theme';
import OnboardingScreen from '../components/OnboardingScreen';
import AuthScreen from '../components/AuthScreen';
import { AuthProvider, useAuth } from '../context/AuthContext';


// Keep native splash visible while we read onboarding status from AsyncStorage.
// This prevents Expo Router from rendering child routes before the gate resolves.
SplashScreen.preventAutoHideAsync();

const TAB_BAR_HEIGHT = 72;
const ONBOARDING_KEY = '@hq/hasOnboarded';

type TabIconProps = { focused: boolean; icon: string; label: string };

function TabIcon({ focused, icon, label }: TabIconProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.tabIconWrap}>
      <View style={[
        styles.iconPill,
        focused && { backgroundColor: colors.primaryMuted },
      ]}>
        <Text style={[styles.tabEmoji, focused && styles.tabEmojiFocused]}>{icon}</Text>
      </View>
      <Text style={[
        styles.tabLabel,
        { color: focused ? colors.tabActive : colors.tabInactive },
        focused && styles.tabLabelFocused,
      ]}>
        {label}
      </Text>
    </View>
  );
}

function TabsLayout({ pendingNavigateToAddHabit, onNavigated }: { pendingNavigateToAddHabit?: boolean; onNavigated?: () => void }) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (pendingNavigateToAddHabit) {
      const timer = setTimeout(() => {
        router.push('/add-habit');
        onNavigated?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pendingNavigateToAddHabit]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: [
            {
              backgroundColor: colors.tabBar,
              borderTopWidth: isDark ? 0 : 1,
              borderTopColor: isDark ? 'transparent' : colors.border,
              height: TAB_BAR_HEIGHT,
              paddingBottom: Platform.OS === 'ios' ? 20 : 8,
              paddingTop: 6,
            },
            !isDark && shadow(8),
          ],
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="🏠" label="Ana Sayfa" />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="📈" label="Ilerleme" />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="📊" label="Istatistik" />
            ),
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="🏆" label="Siralama" />
            ),
          }}
        />
        <Tabs.Screen
          name="shop"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="🛒" label="Magaza" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon="👤" label="Profil" />
            ),
          }}
        />
        <Tabs.Screen
          name="add-habit"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="edit-habit"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="paywall"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return <>{children}</>;
}

function AppContent() {
  const [pendingNavigate, setPendingNavigate] = useState(false);

  return <TabsLayout pendingNavigateToAddHabit={pendingNavigate} onNavigated={() => setPendingNavigate(false)} />;
}

// Debug: Onboarding'i sıfırlamak için kullan (sadece dev'de)
// async function resetOnboarding() {
//   await AsyncStorage.removeItem(ONBOARDING_KEY);
//   console.log('Onboarding reset!');
// }

function RootGate() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => {
        const result = value === 'true';
        console.log('hasOnboarded:', result);
        setHasOnboarded(result);
      })
      .catch(() => setHasOnboarded(false))
      .finally(() => SplashScreen.hideAsync());
  }, []);

  const handleOnboardingFinish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasOnboarded(true);
  }, []);

  // Native splash is still visible (preventAutoHideAsync).
  // Return an empty View so Expo Router keeps the layout mounted — never return null.
  if (hasOnboarded === null) {
    return <View style={{ flex: 1 }} />;
  }

  if (!hasOnboarded) {
    return <OnboardingScreen onFinish={handleOnboardingFinish} />;
  }

  return (
    <AuthProvider>
      <AuthGate>
        <SubscriptionProvider>
          <HabitProvider>
            <FriendProvider>
              <AppContent />
            </FriendProvider>
          </HabitProvider>
        </SubscriptionProvider>
      </AuthGate>
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootGate />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 2,
  },
  tabEmoji: {
    fontSize: 20,
    opacity: 0.6,
  },
  tabEmojiFocused: {
    fontSize: 22,
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  tabLabelFocused: {
    fontWeight: '700',
  },
});
