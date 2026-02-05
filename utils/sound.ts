import { Audio } from 'expo-av';

let sound: Audio.Sound | null = null;

export async function playSuccessSound(): Promise<void> {
  try {
    // Unload previous instance to avoid memory leaks
    if (sound) {
      await sound.unloadAsync();
      sound = null;
    }
    const { sound: s } = await Audio.Sound.createAsync(
      require('../assets/success.wav'),
      { shouldPlay: true, volume: 0.5 },
    );
    sound = s;
    // Auto-cleanup after playback
    s.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        s.unloadAsync();
        if (sound === s) sound = null;
      }
    });
  } catch {
    // Silently fail — sound is optional
  }
}
