import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

const STORAGE_KEY = '@habitquest_premium';

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  buySubscription: () => Promise<boolean>;
  restorePurchase: () => Promise<boolean>;
  checkSubscriptionStatus: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch premium status from Supabase on login, fallback to local cache
  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .single();

        if (cancelled) return;

        if (data?.is_premium) {
          setIsPremium(true);
          await AsyncStorage.setItem(STORAGE_KEY, 'true');
        } else {
          // Check local cache — if user bought premium offline, sync to server
          const local = await AsyncStorage.getItem(STORAGE_KEY);
          if (local === 'true') {
            setIsPremium(true);
            await supabase
              .from('profiles')
              .upsert({ id: user.id, is_premium: true }, { onConflict: 'id' });
          } else {
            setIsPremium(false);
          }
        }
      } catch {
        // Network error — fallback to local cache
        if (!cancelled) {
          const local = await AsyncStorage.getItem(STORAGE_KEY);
          setIsPremium(local === 'true');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const buySubscription = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          setIsPremium(true);
          await AsyncStorage.setItem(STORAGE_KEY, 'true');
          // Persist to Supabase
          if (user) {
            await supabase
              .from('profiles')
              .upsert({ id: user.id, is_premium: true }, { onConflict: 'id' });
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          resolve(true);
        } catch {
          resolve(false);
        }
      }, 1500);
    });
  }, [user?.id]);

  const restorePurchase = useCallback(async (): Promise<boolean> => {
    // Check Supabase first
    if (user) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .single();
        if (data?.is_premium) {
          setIsPremium(true);
          await AsyncStorage.setItem(STORAGE_KEY, 'true');
          return true;
        }
      } catch {
        // Fall through to local check
      }
    }
    // Fallback to local cache
    const local = await AsyncStorage.getItem(STORAGE_KEY);
    if (local === 'true') {
      setIsPremium(true);
      return true;
    }
    return false;
  }, [user?.id]);

  const checkSubscriptionStatus = useCallback(async (): Promise<boolean> => {
    if (user) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', user.id)
          .single();
        if (data?.is_premium) {
          setIsPremium(true);
          await AsyncStorage.setItem(STORAGE_KEY, 'true');
          return true;
        }
      } catch {
        // Fall through to local
      }
    }
    const local = await AsyncStorage.getItem(STORAGE_KEY);
    const status = local === 'true';
    setIsPremium(status);
    return status;
  }, [user?.id]);

  return (
    <SubscriptionContext.Provider
      value={{ isPremium, isLoading, buySubscription, restorePurchase, checkSubscriptionStatus }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}
