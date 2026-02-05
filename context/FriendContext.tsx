import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  MY_CODE: '@habitquest_friend_code',
  FRIENDS: '@habitquest_friends',
};

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  level: number;
  friendCode: string;
  streak: number;
}

interface FriendContextType {
  myFriendCode: string;
  friends: Friend[];
  addFriend: (code: string) => boolean;
  removeFriend: (id: string) => void;
  isLoading: boolean;
}

const FriendContext = createContext<FriendContextType | undefined>(undefined);

function generateFriendCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `HQ-${code.slice(0, 4)}-${code.slice(4)}`;
}

const DUMMY_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Zeynep', avatar: '👩‍🔬', level: 12, friendCode: 'HQ-ZEYP-4821', streak: 45 },
  { id: 'f2', name: 'Ahmet', avatar: '🧑‍💻', level: 10, friendCode: 'HQ-AHMT-9173', streak: 30 },
  { id: 'f3', name: 'Elif', avatar: '👩‍🎨', level: 8, friendCode: 'HQ-ELIF-5540', streak: 21 },
];

export function FriendProvider({ children }: { children: React.ReactNode }) {
  const [myFriendCode, setMyFriendCode] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [savedCode, savedFriends] = await Promise.all([
          AsyncStorage.getItem(KEYS.MY_CODE),
          AsyncStorage.getItem(KEYS.FRIENDS),
        ]);

        let code = savedCode;
        if (!code) {
          code = generateFriendCode();
          await AsyncStorage.setItem(KEYS.MY_CODE, code);
        }
        setMyFriendCode(code);

        if (savedFriends) {
          setFriends(JSON.parse(savedFriends));
        } else {
          setFriends(DUMMY_FRIENDS);
          await AsyncStorage.setItem(KEYS.FRIENDS, JSON.stringify(DUMMY_FRIENDS));
        }
      } catch (e) {
        console.error('FriendContext init failed:', e);
        setMyFriendCode(generateFriendCode());
        setFriends(DUMMY_FRIENDS);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistFriends = useCallback(async (updated: Friend[]) => {
    setFriends(updated);
    await AsyncStorage.setItem(KEYS.FRIENDS, JSON.stringify(updated));
  }, []);

  const addFriend = useCallback(
    (code: string): boolean => {
      const trimmed = code.trim().toUpperCase();

      if (trimmed === myFriendCode) return false;
      if (friends.some((f) => f.friendCode === trimmed)) return false;

      // Dummy friend data from code lookup
      const dummyNames = ['Can', 'Deniz', 'Emre', 'Selin', 'Mert', 'Aylin', 'Kaan', 'Defne'];
      const dummyAvatars = ['🧑‍🚀', '🧜‍♀️', '🦸‍♂️', '🧝‍♀️', '🧑‍🎤', '👩‍🚒', '🧑‍⚕️', '🧙‍♀️'];
      const idx = Math.floor(Math.random() * dummyNames.length);

      const newFriend: Friend = {
        id: `f_${Date.now()}`,
        name: dummyNames[idx],
        avatar: dummyAvatars[idx],
        level: Math.floor(Math.random() * 10) + 1,
        friendCode: trimmed,
        streak: Math.floor(Math.random() * 20),
      };

      persistFriends([...friends, newFriend]);
      return true;
    },
    [friends, myFriendCode, persistFriends],
  );

  const removeFriend = useCallback(
    (id: string) => {
      persistFriends(friends.filter((f) => f.id !== id));
    },
    [friends, persistFriends],
  );

  return (
    <FriendContext.Provider value={{ myFriendCode, friends, addFriend, removeFriend, isLoading }}>
      {children}
    </FriendContext.Provider>
  );
}

export function useFriends() {
  const ctx = useContext(FriendContext);
  if (!ctx) throw new Error('useFriends must be used within FriendProvider');
  return ctx;
}
