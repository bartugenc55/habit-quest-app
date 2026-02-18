import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
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
import CreateNameScreen from '../components/CreateNameScreen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useActivityTracker } from '../utils/activity';
import { setAnalyticsUserId, logNotificationEvent } from '../utils/notificationAnalytics';
import { loadProfile } from '../utils/storage';
import { resetAuthOnFreshInstallIfNeeded } from '../utils/firstRunReset';


// Keep native splash visible until the auth gate resolves.
// Gate order: auth → onboarding → name/profile → tabs.
// If onboarding not completed, effectiveUser = null (treat as logged out).
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

function AppContent() {
  const [pendingNavigate, setPendingNavigate] = useState(false);
  const { user } = useAuth();
  const responseListener = useRef<Notifications.EventSubscription>();

  // Activity tracking — upserts last_seen_at on mount & foreground
  useActivityTracker(user?.id);

  // Set analytics userId so notification scheduling logs work
  useEffect(() => {
    setAnalyticsUserId(user?.id ?? null);
  }, [user?.id]);

  // Log 'opened' event when user taps a notification
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const tag = (response.notification.request.content.data as Record<string, unknown>)?.tag;
      if (typeof tag === 'string' && user?.id) {
        logNotificationEvent('opened', tag, user.id).catch(() => {});
      }
    });

    return () => {
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user?.id]);

  return <TabsLayout pendingNavigateToAddHabit={pendingNavigate} onNavigated={() => setPendingNavigate(false)} />;
}

// Debug: Onboarding'i sıfırlamak için kullan (sadece dev'de)
// async function resetOnboarding() {
//   await AsyncStorage.removeItem(ONBOARDING_KEY);
//   console.log('Onboarding reset!');
// }

function RootGate() {
  const { user, session, isLoading: authLoading } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);

  // 1. Load onboarding flag from AsyncStorage (runs once on mount)
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => setHasOnboarded(value === 'true'))
      .catch(() => setHasOnboarded(false));
  }, []);

  // Derived: if onboarding not completed, treat user as logged out
  const effectiveUser = hasOnboarded ? user : null;
  const effectiveSession = hasOnboarded ? session : null;

  // 3. Load profile name when an effective user session exists
  useEffect(() => {
    if (!effectiveUser) {
      setProfileName(null);
      setProfileChecked(false);
      return;
    }
    setProfileChecked(false);
    loadProfile()
      .then((p) => setProfileName(p?.name || ''))
      .catch(() => setProfileName(''))
      .finally(() => setProfileChecked(true));
  }, [effectiveUser]);

  // 4. Hide splash as soon as we can determine what to show
  useEffect(() => {
    if (authLoading) return;
    if (hasOnboarded === null) return;
    if (!effectiveUser) { SplashScreen.hideAsync(); return; }
    if (profileChecked) { SplashScreen.hideAsync(); return; }
  }, [authLoading, hasOnboarded, effectiveUser, profileChecked]);

  const handleOnboardingFinish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setHasOnboarded(true);
  }, []);

  const handleNameSet = useCallback((name: string) => {
    setProfileName(name);
  }, []);

  // ── Debug ──
  console.log('[RootGate]', {
    authLoading,
    onboardingCompleted: hasOnboarded,
    sessionExists: !!user,
    effectiveSession: !!effectiveSession,
    profileChecked,
    hasName: !!profileName,
  });

  // ── Gate: auth → onboarding → name → tabs ──

  // 1. Wait for Supabase auth + onboarding flag to resolve
  if (authLoading || hasOnboarded === null) {
    return <View style={{ flex: 1 }} />;
  }

  // 2. No effective session (onboarding not done OR genuinely no session)
  if (!effectiveUser) {
    // 2a. Onboarding not completed → show onboarding
    if (!hasOnboarded) {
      return <OnboardingScreen onFinish={handleOnboardingFinish} />;
    }
    // 2b. Onboarded but no session → must login
    return <AuthScreen />;
  }

  // 3. Wait for profile load
  if (!profileChecked) {
    return <View style={{ flex: 1 }} />;
  }

  // 4. No profile name → must create one
  if (!profileName) {
    return <CreateNameScreen onNameSet={handleNameSet} />;
  }

  // 5. All gates passed → main app
  return (
    <SubscriptionProvider>
      <HabitProvider>
        <FriendProvider>
          <AppContent />
        </FriendProvider>
      </HabitProvider>
    </SubscriptionProvider>
  );
}

export default function RootLayout() {
  const [bootReady, setBootReady] = useState(false);

  // Run fresh-install keychain cleanup BEFORE Supabase client is created.
  // Native splash screen stays visible until boot + auth gate resolve.
  useEffect(() => {
    console.log('[Boot] start');
    resetAuthOnFreshInstallIfNeeded().then(() => {
      setBootReady(true);
    });
  }, []);

  if (!bootReady) {
    // Return minimal wrapper; native splash screen covers the screen.
    return <View style={{ flex: 1 }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <RootGate />
        </AuthProvider>
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
