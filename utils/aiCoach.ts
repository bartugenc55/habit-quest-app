import AsyncStorage from '@react-native-async-storage/async-storage';

const COACH_KEY = '@habitquest_coach_message';
const COACH_DATE_KEY = '@habitquest_coach_date';

interface CoachStats {
  completedHabits: number;
  totalHabits: number;
  streak: number;
}

const messages = {
  perfect: [
    'Muhtesem! Tum gorevlerini tamamladin. Bu disiplin seni zirveye tasir!',
    'Yuzde yuz basari! Kendine gurur duyabilirsin, devam et!',
    'Bugunku hedeflerin tamam! Bu tempo ile durdurulamaz olacaksin.',
    'Hepsini bitirdin, harika is! Istikrar basarinin anahtari.',
  ],
  good: [
    'Iyi gidiyorsun! Birkaç adim daha ve bugunu de fethedeceksin.',
    'Guzel ilerleme! Kalan gorevleri de tamamlayarak gunu taclayabilirsin.',
    'Yarisini gectin, bu harika! Kucuk adimlar buyuk sonuclar getirir.',
    'Gayretin goruluyor! Bugunku kalan hedeflerini de dene.',
  ],
  low: [
    'Her gun yeni bir baslangic. Bugun sadece bir aliskanlikla basla!',
    'Kucuk adimlar buyuk degisimler yaratir. Bir tane tamamla, gerisine bak.',
    'Zor gunler de surecin parcasi. Kendine nazik ol ve bir adim at.',
    'Onemli olan devam etmek. Bugun tek bir gorevle fark yarat!',
  ],
  streakHigh: [
    'Serin {streak} gune ulasti! Bu tutarlilik inanilmaz, birakmaa!',
    '{streak} gunluk seri! Disiplinin ilham verici, boyle devam.',
    'Arka arkaya {streak} gun! Sen bir aliskanlik makinesisin.',
  ],
  noHabits: [
    'Henuz aliskanlik eklemedin. Ilk adimi atarak yolculuguna basla!',
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateDailyCoachMessage(stats: CoachStats): string {
  const { completedHabits, totalHabits, streak } = stats;

  if (totalHabits === 0) {
    return pickRandom(messages.noHabits);
  }

  const ratio = completedHabits / totalHabits;

  // Streak congratulation takes priority when streak is high
  if (streak > 7) {
    const streakMsg = pickRandom(messages.streakHigh).replace('{streak}', String(streak));
    // Also append performance feedback if not perfect
    if (ratio >= 1) {
      return streakMsg;
    }
    return streakMsg;
  }

  if (ratio >= 1) {
    return pickRandom(messages.perfect);
  }
  if (ratio >= 0.5) {
    return pickRandom(messages.good);
  }
  return pickRandom(messages.low);
}

export async function getCachedCoachMessage(): Promise<string | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cachedDate = await AsyncStorage.getItem(COACH_DATE_KEY);
    if (cachedDate === today) {
      return await AsyncStorage.getItem(COACH_KEY);
    }
    return null;
  } catch {
    return null;
  }
}

export async function cacheCoachMessage(message: string): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem(COACH_KEY, message);
    await AsyncStorage.setItem(COACH_DATE_KEY, today);
  } catch {
    // silently fail
  }
}
