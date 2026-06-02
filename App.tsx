import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  Platform,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppSplashScreen from './src/components/AppSplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import {
  ApiError,
  ChannelsResponse,
  getChannelsSnapshot,
  getCurrentSession,
  login,
  logout,
} from './src/services/api';
import {
  checkForAppUpdate,
  downloadAndInstallApk,
  fetchAppVersion,
  getCurrentAppVersionCode,
} from './src/services/UpdateService';
import { ChannelSortMode } from './src/services/channelService';
import {
  clearAuthSession,
  clearLocalSessionData,
  getAuthSession,
  getFavoriteChannelIds,
  getOrCreateDeviceId,
  saveAuthSession,
  toggleFavoriteChannelId,
  StoredAuthSession,
} from './src/services/storage';
import { IPTVChannel } from './src/types/iptv';

const CHANNEL_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const CHANNEL_LOAD_MAX_ATTEMPTS = 3;
const CHANNEL_LOAD_RETRY_DELAY_MS = 1200;
const SESSION_STATUS_POLL_INTERVAL_MS = 10 * 1000;

interface UpdateState {
  isChecking: boolean;
  isForceUpdateRequired: boolean;
  isOptionalUpdateAvailable: boolean;
  updateError: string | null;
}

type ChannelsLoadStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'missing_playlist'
  | 'temporary_error';

interface ChannelsLoadState {
  status: ChannelsLoadStatus;
  message: string | null;
}

const MISSING_PLAYLIST_MESSAGE =
  'No hay playlist configurada. Contactá al administrador.';
const LOADING_CHANNELS_MESSAGE = 'Cargando canales...';
const TEMPORARY_CHANNELS_MESSAGE =
  'No se pudieron cargar los canales. Intentá nuevamente.';
const EXPIRED_SESSION_MESSAGE = 'Tu sesión venció. Ingresá nuevamente.';
const ADMIN_CLOSED_SESSION_MESSAGE = 'Sesión cerrada por el administrador';
const ADMIN_CANCELED_ACCOUNT_MESSAGE =
  'Cuenta cancelada por al administrador. Motivo:';

const wait = (milliseconds: number) =>
  new Promise<void>(resolve => setTimeout(() => resolve(), milliseconds));

const getCanceledAccountMessage = (reason: string) =>
  `${ADMIN_CANCELED_ACCOUNT_MESSAGE} ${reason.trim() || 'Sin motivo especificado'}`;

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [showSplash, setShowSplash] = useState(true);
  const [activeChannel, setActiveChannel] = useState<IPTVChannel | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [homeSelectedCategory, setHomeSelectedCategory] = useState('Todos');
  const [homeSortMode, setHomeSortMode] = useState<ChannelSortMode>('name');
  const [authSession, setAuthSession] = useState<StoredAuthSession | null>(null);
  const [channels, setChannels] = useState<IPTVChannel[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [channelsLoadState, setChannelsLoadState] = useState<ChannelsLoadState>({
    status: 'idle',
    message: null,
  });
  const [updateState, setUpdateState] = useState<UpdateState>({
    isChecking: true,
    isForceUpdateRequired: false,
    isOptionalUpdateAvailable: false,
    updateError: null,
  });
  const channelsUpdatedAtRef = useRef<string | null>(null);
  const hasChannelsRef = useRef(false);

  const applyChannelsSnapshot = useCallback((snapshot: ChannelsResponse) => {
    if (channelsUpdatedAtRef.current === snapshot.updatedAt) {
      return;
    }

    channelsUpdatedAtRef.current = snapshot.updatedAt;
    hasChannelsRef.current = snapshot.channels.length > 0;
    setChannels(snapshot.channels);
    setActiveChannel(currentChannel => {
      if (!currentChannel) {
        return currentChannel;
      }

      return (
        snapshot.channels.find(channel => channel.id === currentChannel.id) ||
        null
      );
    });
  }, []);

  const isSessionError = (error: unknown) =>
    error instanceof ApiError && (error.status === 401 || error.status === 403);

  const isPlaylistMissingError = (error: unknown) =>
    error instanceof ApiError &&
    error.status === 404 &&
    error.code === 'PLAYLIST_NOT_FOUND';

  const isCanceledAccountError = (error: unknown) =>
    error instanceof ApiError &&
    error.status === 403 &&
    error.code === 'SERVICE_CANCELED';

  const expireSession = useCallback(async () => {
    await clearAuthSession();
    setAuthSession(null);
    setActiveChannel(null);
    setChannelsLoadState({ status: 'idle', message: null });
    setLoginError(EXPIRED_SESSION_MESSAGE);
  }, []);

  const closeSessionFromAdmin = useCallback(async () => {
    await clearAuthSession();
    setAuthSession(null);
    setActiveChannel(null);
    setChannels([]);
    setFavoriteIds([]);
    channelsUpdatedAtRef.current = null;
    hasChannelsRef.current = false;
    setChannelsLoadState({ status: 'idle', message: null });
    setLoginError(ADMIN_CLOSED_SESSION_MESSAGE);
  }, []);

  const closeCanceledAccountFromAdmin = useCallback(async (reason: string) => {
    await clearAuthSession();
    setAuthSession(null);
    setActiveChannel(null);
    setChannels([]);
    setFavoriteIds([]);
    channelsUpdatedAtRef.current = null;
    hasChannelsRef.current = false;
    setChannelsLoadState({ status: 'idle', message: null });
    setLoginError(getCanceledAccountMessage(reason));
  }, []);

  const loadChannelsForToken = useCallback(
    async (
      token: string,
      options: {
        attempts?: number;
        preserveReadyOnTemporaryError?: boolean;
        showLoading?: boolean;
      } = {},
    ): Promise<boolean> => {
      const maxAttempts = options.attempts || CHANNEL_LOAD_MAX_ATTEMPTS;

      if (options.showLoading !== false) {
        setChannelsLoadState({ status: 'loading', message: null });
      }

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const nextChannelsSnapshot = await getChannelsSnapshot(token);
          applyChannelsSnapshot(nextChannelsSnapshot);
          setChannelsLoadState({ status: 'ready', message: null });
          return true;
        } catch (error) {
          if (isSessionError(error)) {
            await expireSession();
            return false;
          }

          if (isPlaylistMissingError(error)) {
            hasChannelsRef.current = false;
            setChannels([]);
            setActiveChannel(null);
            setChannelsLoadState({
              status: 'missing_playlist',
              message: MISSING_PLAYLIST_MESSAGE,
            });
            return false;
          }

          if (attempt < maxAttempts) {
            await wait(CHANNEL_LOAD_RETRY_DELAY_MS);
            continue;
          }

          if (options.preserveReadyOnTemporaryError || hasChannelsRef.current) {
            setChannelsLoadState({ status: 'ready', message: null });
            return false;
          }

          setChannelsLoadState({
            status: 'temporary_error',
            message: TEMPORARY_CHANNELS_MESSAGE,
          });
          return false;
        }
      }

      return false;
    },
    [applyChannelsSnapshot, expireSession],
  );

  useEffect(() => {
    const initializeApp = async () => {
      // PASO 1: Verificar actualización PRIMERO
      if (Platform.OS === 'android') {
        const isForceUpdateRequired = await checkForAppUpdateOnInit();
        // Si hay forceUpdate, no continuar con auth
        if (isForceUpdateRequired) {
          return;
        }
      }

      // PASO 2: Luego hidratar datos de autenticación
      const [storedAuthSession, favorites] = await Promise.all([
        getAuthSession(),
        getFavoriteChannelIds(),
      ]);

      setFavoriteIds(favorites);

      if (!storedAuthSession) {
        setIsAuthReady(true);
        return;
      }

      try {
        await getCurrentSession(storedAuthSession.token);
        setAuthSession(storedAuthSession);
        await loadChannelsForToken(storedAuthSession.token);
      } catch (error) {
        if (isSessionError(error)) {
          await expireSession();
          return;
        } else {
          setAuthSession(storedAuthSession);
          setChannelsLoadState({
            status: 'temporary_error',
            message: TEMPORARY_CHANNELS_MESSAGE,
          });
        }
      } finally {
        setIsAuthReady(true);
      }
    };

    initializeApp().catch(() => {
      setLoginError('No se pudo iniciar la app. Revisá la conexión.');
      setIsAuthReady(true);
      setUpdateState(prev => ({
        ...prev,
        isChecking: false,
      }));
    });
  }, [expireSession, loadChannelsForToken]);

  const checkForAppUpdateOnInit = async (): Promise<boolean> => {
    try {
      setUpdateState(prev => ({
        ...prev,
        isChecking: true,
        updateError: null,
      }));

      const [currentVersionCode, remoteVersion] = await Promise.all([
        getCurrentAppVersionCode(),
        fetchAppVersion(),
      ]);

      // No hay actualización disponible
      if (remoteVersion.versionCode <= currentVersionCode) {
        setUpdateState(prev => ({
          ...prev,
          isChecking: false,
        }));
        return false;
      }

      // Hay actualización disponible
      if (remoteVersion.forceUpdate) {
        // FORCEUPDATE: Bloquear app y esperar actualización
        setUpdateState(prev => ({
          ...prev,
          isForceUpdateRequired: true,
          isChecking: false,
        }));

        // Iniciar descarga automática
        try {
          await downloadAndInstallApk(remoteVersion.apkUrl, remoteVersion.versionName);
        } catch (error) {
          setUpdateState(prev => ({
            ...prev,
            updateError: `Error al instalar actualización: ${error instanceof Error ? error.message : 'desconocido'}`,
          }));
        }
        return true;
      } else {
        // UPDATE OPCIONAL: Mostrar en splash y permitir diferir
        setUpdateState(prev => ({
          ...prev,
          isOptionalUpdateAvailable: true,
          isChecking: false,
        }));

        // Mostrar alerta al usuario
        await new Promise<void>(resolve => {
          Alert.alert(
            'Actualización disponible',
            `Se detectó una nueva versión ${remoteVersion.versionName}. ¿Deseas actualizar ahora?`,
            [
              {
                text: 'Actualizar ahora',
                onPress: async () => {
                  try {
                    await downloadAndInstallApk(
                      remoteVersion.apkUrl,
                      remoteVersion.versionName,
                    );
                  } catch (error) {
                    Alert.alert(
                      'Error',
                      `No se pudo instalar: ${error instanceof Error ? error.message : 'desconocido'}`,
                    );
                  }
                  setUpdateState(prev => ({
                    ...prev,
                    isOptionalUpdateAvailable: false,
                  }));
                  resolve();
                },
              },
              {
                text: 'Más tarde',
                style: 'cancel',
                onPress: () => {
                  setUpdateState(prev => ({
                    ...prev,
                    isOptionalUpdateAvailable: false,
                  }));
                  resolve();
                },
              },
            ],
            { cancelable: false },
          );
        });
        return false;
      }
    } catch (error) {
      // Error al verificar actualización (no es crítico, permitir continuar)
      const errorMessage =
        error instanceof ApiError
          ? `No se pudo verificar versión: ${error.message}`
          : 'Error al verificar actualización';

      console.warn('Error en OTA check:', errorMessage);
      setUpdateState(prev => ({
        ...prev,
        isChecking: false,
        updateError: null, // No mostrar error en UI, solo log
      }));
      return false;
    }
  };

  // Verificación periódica de actualización en background (después de init)
  useEffect(() => {
    if (Platform.OS !== 'android' || updateState.isForceUpdateRequired) {
      return;
    }

    // Ejecutar verificación periódicamente (cada 30 minutos)
    const updateInterval = setInterval(() => {
      checkForAppUpdate().catch((error) => {
        console.warn('Error en verificación periódica de OTA:', error);
      });
    }, 30 * 60 * 1000);

    return () => clearInterval(updateInterval);
  }, [updateState.isForceUpdateRequired]);

  useEffect(() => {
    // Mostrar splash al menos 2200ms, pero si aún está verificando actualización, esperar
    const splashTimeout = setTimeout(() => {
      if (!updateState.isChecking) {
        setShowSplash(false);
      }
    }, 2200);

    return () => clearTimeout(splashTimeout);
  }, [updateState.isChecking]);

  // Ocultar splash cuando termine la verificación de actualización
  useEffect(() => {
    if (!updateState.isChecking && !updateState.isForceUpdateRequired && showSplash) {
      const hideTimeout = setTimeout(() => {
        setShowSplash(false);
      }, 300);
      return () => clearTimeout(hideTimeout);
    }
  }, [updateState.isChecking, updateState.isForceUpdateRequired, showSplash]);

  useEffect(() => {
    if (!authSession) {
      channelsUpdatedAtRef.current = null;
      hasChannelsRef.current = false;
      setChannels([]);
      setChannelsLoadState({ status: 'idle', message: null });
      return;
    }

    let isMounted = true;

    const refreshChannels = async () => {
      try {
        if (isMounted) {
          await loadChannelsForToken(authSession.token, {
            attempts: 1,
            preserveReadyOnTemporaryError: true,
            showLoading: false,
          });
        }
      } catch (error) {
        if (
          isMounted &&
          error instanceof ApiError &&
          error.status === 401
        ) {
          await clearAuthSession();
          setAuthSession(null);
          setActiveChannel(null);
          setLoginError('Tu sesión venció. Ingresá nuevamente.');
        }
      }
    };

    const refreshInterval = setInterval(
      refreshChannels,
      CHANNEL_REFRESH_INTERVAL_MS,
    );
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        if (nextAppState === 'active') {
          refreshChannels();
        }
      },
    );

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
      appStateSubscription.remove();
    };
  }, [authSession, loadChannelsForToken]);

  useEffect(() => {
    if (!authSession) {
      return;
    }

    let isMounted = true;

    const checkSessionStatus = async () => {
      try {
        await getCurrentSession(authSession.token);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isCanceledAccountError(error)) {
          await closeCanceledAccountFromAdmin(
            error instanceof ApiError ? error.canceledReason || '' : '',
          );
          return;
        }

        if (isSessionError(error)) {
          await closeSessionFromAdmin();
        }
      }
    };

    const sessionStatusInterval = setInterval(
      checkSessionStatus,
      SESSION_STATUS_POLL_INTERVAL_MS,
    );

    return () => {
      isMounted = false;
      clearInterval(sessionStatusInterval);
    };
  }, [authSession, closeCanceledAccountFromAdmin, closeSessionFromAdmin]);

  const handleToggleFavorite = async (channel: IPTVChannel) => {
    const nextFavorites = await toggleFavoriteChannelId(channel.id);
    setFavoriteIds(nextFavorites);
  };

  const getLoginErrorMessage = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.code === 'INVALID_CREDENTIALS') {
        return 'Usuario o contraseña incorrectos.';
      }

      if (error.code === 'DEVICE_LIMIT_REACHED') {
        return 'Este usuario ya está activo en otro dispositivo.';
      }

      if (error.code === 'SERVICE_CANCELED') {
        return getCanceledAccountMessage(error.canceledReason || '');
      }

      return error.message;
    }

    return 'No se pudo conectar con el servidor.';
  };

  const handleLogin = async (username: string, password: string) => {
    setIsLoginLoading(true);
    setLoginError(null);

    try {
      const deviceId = await getOrCreateDeviceId();
      const response = await login({
        username,
        password,
        deviceId,
        deviceName: 'Android TV',
      });
      const nextAuthSession = {
        token: response.token,
        expiresAt: response.expiresAt,
        username: response.user.username,
      };

      await saveAuthSession(nextAuthSession);
      setAuthSession(nextAuthSession);
      setActiveChannel(null);
      await loadChannelsForToken(response.token);
    } catch (error) {
      setLoginError(getLoginErrorMessage(error));
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Renderizar UI bloqueante si forceUpdate está activo
  const handleRetryChannels = async () => {
    if (!authSession) {
      return;
    }

    await loadChannelsForToken(authSession.token);
  };

  const handleRequestExit = useCallback(
    async (shouldLogout: boolean) => {
      if (shouldLogout) {
        const token = authSession?.token;

        if (token) {
          await logout(token);
        }

        await clearLocalSessionData();
        setAuthSession(null);
        setActiveChannel(null);
        setChannels([]);
        setFavoriteIds([]);
        channelsUpdatedAtRef.current = null;
        hasChannelsRef.current = false;
      }

      BackHandler.exitApp();
    },
    [authSession?.token],
  );

  if (updateState.isForceUpdateRequired) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={[styles.container, styles.centerContainer]}>
          <ActivityIndicator size="large" color="#ff6b00" style={styles.loaderMargin} />
          <View style={styles.updateBlockingContent}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <View style={styles.updateBlockingContainer}>
              <View style={styles.updateBlockingBox}>
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#ff6b00" />
                </View>
              </View>
            </View>
          </View>
          {updateState.updateError && (
            <View style={styles.errorContainer}>
              <View style={styles.errorBox}>
                <StatusBar barStyle="light-content" />
              </View>
            </View>
          )}
        </View>
      </SafeAreaProvider>
    );
  }

  // Renderizar UI principal con lógica de splash/auth
  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        {/* Mostrar splash mientras verifica actualización o carga auth */}
        {(showSplash || !isAuthReady || updateState.isChecking) && (
          <View style={styles.splashContainer}>
            <AppSplashScreen />
            {updateState.isChecking && (
              <View style={styles.loaderOverlay}>
                <ActivityIndicator size="large" color="#ff6b00" />
              </View>
            )}
          </View>
        )}

        {/* Mostrar login o contenido principal */}
        {!showSplash && isAuthReady && !updateState.isChecking && (
          <>
            {!authSession ? (
              <LoginScreen
                errorMessage={loginError}
                isLoading={isLoginLoading}
                onLogin={handleLogin}
              />
            ) : channelsLoadState.status === 'missing_playlist' ||
              channelsLoadState.status === 'temporary_error' ||
              channelsLoadState.status === 'loading' ? (
              <ChannelsUnavailableScreen
                isLoading={channelsLoadState.status === 'loading'}
                message={
                  channelsLoadState.status === 'loading'
                    ? LOADING_CHANNELS_MESSAGE
                    : channelsLoadState.message || TEMPORARY_CHANNELS_MESSAGE
                }
                onRetry={handleRetryChannels}
              />
            ) : activeChannel ? (
              <PlayerScreen
                channel={activeChannel}
                channels={channels}
                onBack={() => setActiveChannel(null)}
                onChangeChannel={setActiveChannel}
                isFavorite={favoriteIds.includes(activeChannel.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ) : (
              <HomeScreen
                channels={channels}
                selectedCategory={homeSelectedCategory}
                sortMode={homeSortMode}
                onSelectCategory={setHomeSelectedCategory}
                onSelectSortMode={setHomeSortMode}
                onOpenChannel={setActiveChannel}
                onRequestExit={handleRequestExit}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaProvider>
  );
}

function ChannelsUnavailableScreen({
  isLoading,
  message,
  onRetry,
}: {
  isLoading: boolean;
  message: string;
  onRetry: () => Promise<void>;
}) {
  return (
    <View style={styles.channelsUnavailableContainer}>
      <Text style={styles.channelsUnavailableTitle}>
        {isLoading ? 'Cargando canales' : 'Canales no disponibles'}
      </Text>
      <Text style={styles.channelsUnavailableMessage}>{message}</Text>
      <Pressable
        onPress={() => onRetry().catch(() => undefined)}
        disabled={isLoading}
        hasTVPreferredFocus
        style={({ pressed, focused }) => [
          styles.retryButton,
          focused && styles.retryButtonFocused,
          pressed && styles.retryButtonPressed,
          isLoading && styles.retryButtonDisabled,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Text style={styles.retryButtonText}>Reintentar</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#050505',
  },
  loaderMargin: {
    marginBottom: 20,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateBlockingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  updateBlockingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateBlockingBox: {
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff6b00',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  errorBox: {
    backgroundColor: '#cc0000',
    padding: 16,
  },
  channelsUnavailableContainer: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  channelsUnavailableTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  channelsUnavailableMessage: {
    color: '#d0d0d0',
    fontSize: 17,
    lineHeight: 24,
    marginTop: 12,
    maxWidth: 560,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 54,
    minWidth: 160,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    paddingHorizontal: 24,
  },
  retryButtonFocused: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.04 }],
  },
  retryButtonPressed: {
    opacity: 0.86,
  },
  retryButtonDisabled: {
    opacity: 0.55,
  },
  retryButtonText: {
    color: '#111',
    fontSize: 17,
    fontWeight: '800',
  },
});

export default App;
