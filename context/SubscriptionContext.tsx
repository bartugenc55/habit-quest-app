import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

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
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === 'true') setIsPremium(true);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const buySubscription = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          setIsPremium(true);
          await AsyncStorage.setItem(STORAGE_KEY, 'true');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          resolve(true);
        } catch {
          resolve(false);
        }
      }, 1500);
    });
  }, []);

  const restorePurchase = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const val = await AsyncStorage.getItem(STORAGE_KEY);
          if (val === 'true') {
            setIsPremium(true);
            resolve(true);
          } else {
            resolve(false);
          }
        } catch {
          resolve(false);
        }
      }, 1000);
    });
  }, []);

  const checkSubscriptionStatus = useCallback(async (): Promise<boolean> => {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEY);
      const status = val === 'true';
      setIsPremium(status);
      return status;
    } catch {
      return false;
    }
  }, []);

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
