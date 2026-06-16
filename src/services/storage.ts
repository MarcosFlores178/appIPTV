import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_CHANNEL_KEY = '@EstranetTV:last-channel-id';
const FAVORITE_CHANNELS_KEY = '@EstranetTV:favorite-channel-ids';
const AUTH_SESSION_KEY = '@EstranetTV:auth-session';
const DEVICE_ID_KEY = '@EstranetTV:device-id';

export interface StoredAuthSession {
  token: string;
  expiresAt: string;
  username: string;
}

export const saveLastChannelId = async (channelId: string): Promise<void> => {
  await AsyncStorage.setItem(LAST_CHANNEL_KEY, channelId);
};

export const getLastChannelId = async (): Promise<string | null> =>
  AsyncStorage.getItem(LAST_CHANNEL_KEY);

export const getFavoriteChannelIds = async (): Promise<string[]> => {
  const rawValue = await AsyncStorage.getItem(FAVORITE_CHANNELS_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue)
      ? parsedValue.filter(item => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

export const toggleFavoriteChannelId = async (
  channelId: string,
): Promise<string[]> => {
  const currentFavorites = await getFavoriteChannelIds();
  const nextFavorites = currentFavorites.includes(channelId)
    ? currentFavorites.filter(id => id !== channelId)
    : [...currentFavorites, channelId];

  await AsyncStorage.setItem(
    FAVORITE_CHANNELS_KEY,
    JSON.stringify(nextFavorites),
  );

  return nextFavorites;
};

export const saveAuthSession = async (
  session: StoredAuthSession,
): Promise<void> => {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
};

export const getAuthSession = async (): Promise<StoredAuthSession | null> => {
  const rawValue = await AsyncStorage.getItem(AUTH_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (
      typeof parsedValue?.token === 'string' &&
      typeof parsedValue?.expiresAt === 'string' &&
      typeof parsedValue?.username === 'string'
    ) {
      return parsedValue;
    }
  } catch {
    return null;
  }

  return null;
};

export const clearAuthSession = async (): Promise<void> => {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
};

export const clearLocalSessionData = async (): Promise<void> => {
  await Promise.all([
    AsyncStorage.removeItem(AUTH_SESSION_KEY),
    AsyncStorage.removeItem(LAST_CHANNEL_KEY),
    AsyncStorage.removeItem(FAVORITE_CHANNELS_KEY),
  ]);
};

export const getOrCreateDeviceId = async (): Promise<string> => {
  const storedDeviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

  if (storedDeviceId) {
    return storedDeviceId;
  }

  const nextDeviceId = `android-tv-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;

  await AsyncStorage.setItem(DEVICE_ID_KEY, nextDeviceId);
  return nextDeviceId;
};
