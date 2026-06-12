import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, // <-- AGREGAR ESTO
  BackHandler,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import CategoryTabs from '../components/CategoryTabs';
import ChannelGrid from '../components/ChannelGrid';
import {
  ChannelSortMode,
  filterChannelsByCategory,
  getChannelCategories,
  searchChannels,
  sortVisibleChannels,
} from '../services/channelService';
import {
  getFavoriteChannelIds,
  getLastChannelId,
  saveLastChannelId,
} from '../services/storage';
import { IPTVChannel } from '../types/iptv';

interface HomeScreenProps {
  channels: IPTVChannel[];
  channelsLoading: boolean;       // <-- NUEVO: Para saber si el backend sigue cargando
  channelsError: string | null;   // <-- NUEVO: Para recibir el mensaje de error si falla
  onRetryChannels: () => Promise<void>; // <-- NUEVO: La función de reintento que viene de App.tsx
  selectedCategory: string;
  sortMode: ChannelSortMode;
  onSelectCategory: (category: string) => void;
  onSelectSortMode: (sortMode: ChannelSortMode) => void;
  onOpenChannel: (channel: IPTVChannel) => void;
  onRequestExit: (shouldLogout: boolean) => Promise<void>;
}

const appLogo = require('../../assets/branding/app-logo.png');

export default function HomeScreen({
  channels: allChannels,
  channelsLoading,   // <-- NUEVO
  channelsError,     // <-- NUEVO
  onRetryChannels,   // <-- NUEVO
  selectedCategory,
  sortMode,
  onSelectCategory,
  onSelectSortMode,
  onOpenChannel,
  onRequestExit,
}: HomeScreenProps)  {
  const [selectedChannel, setSelectedChannel] = useState<string>(
    allChannels[0]?.id ?? '',
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isExitDialogVisible, setIsExitDialogVisible] = useState(false);
  const [shouldLogoutOnExit, setShouldLogoutOnExit] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isCategorySortEnabled = selectedCategory === 'Todos';
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  );

  useEffect(() => {
    const hydrateScreen = async () => {
      const [lastChannelId, favorites] = await Promise.all([
        getLastChannelId(),
        getFavoriteChannelIds(),
      ]);

      setFavoriteIds(favorites);

      if (lastChannelId && allChannels.some(channel => channel.id === lastChannelId)) {
        setSelectedChannel(lastChannelId);
      }
    };

    hydrateScreen().catch(() => undefined);
  }, [allChannels]);

  useEffect(() => {
    if (
      allChannels.length > 0 &&
      !allChannels.some(channel => channel.id === selectedChannel)
    ) {
      setSelectedChannel(allChannels[0].id);
    }
  }, [allChannels, selectedChannel]);

  useEffect(() => {
    const updateTime = () =>
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      );

    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleBackPress = () => {
      if (isExitDialogVisible) {
        setIsExitDialogVisible(false);
        return true;
      }

      setShouldLogoutOnExit(false);
      setIsExitDialogVisible(true);
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    return () => subscription.remove();
  }, [isExitDialogVisible]);

  const categories = useMemo(() => {
    const baseCategories = getChannelCategories(allChannels);

    return favoriteIds.length > 0
      ? [...baseCategories, 'Favoritos']
      : baseCategories;
  }, [allChannels, favoriteIds]);

  const categoryChannels = useMemo(() => {
    if (selectedCategory === 'Favoritos') {
      return allChannels.filter(channel => favoriteIds.includes(channel.id));
    }

    return filterChannelsByCategory(allChannels, selectedCategory);
  }, [allChannels, favoriteIds, selectedCategory]);
  const channels = useMemo(() => {
    const searchedChannels = searchChannels(categoryChannels, searchQuery);
    return sortVisibleChannels(searchedChannels, sortMode);
  }, [categoryChannels, searchQuery, sortMode]);

  useEffect(() => {
    if (selectedCategory !== 'Todos' && sortMode === 'group') {
      onSelectSortMode('name');
    }
  }, [onSelectSortMode, selectedCategory, sortMode]);

  const emptyMessage = searchQuery.trim()
    ? `No encontramos canales para "${searchQuery.trim()}".`
    : 'Proba otra categoria o carga una playlist distinta.';

  const handleChannelPress = (channel: IPTVChannel) => {
    setSelectedChannel(channel.id);
    saveLastChannelId(channel.id).catch(() => undefined);
    onOpenChannel(channel);
  };

  const handleCancelExit = () => {
    if (isExiting) {
      return;
    }

    setIsExitDialogVisible(false);
  };

  const handleConfirmExit = async () => {
    if (isExiting) {
      return;
    }

    setIsExiting(true);
    await onRequestExit(shouldLogoutOnExit);
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <Image source={appLogo} resizeMode="contain" resizeMethod="resize" style={styles.brandLogo} />
          <Text style={styles.clock}>{currentTime}</Text>
        </View>
        {/* <Text style={styles.subtitle}>
          Navega canales en una grilla simple para TV y retoma rapido donde lo
          dejaste.
        </Text> */}

        <View style={styles.statsRow}>
          {/* <View style={styles.statCard}>
            <Text style={styles.statValue}>{allChannels.length}</Text>
            <Text style={styles.statLabel}>canales cargados</Text>
          </View> */}

          {/* <View style={styles.statCard}>
            <Text style={styles.statValue}>{channels.length}</Text>
            <Text style={styles.statLabel}>visibles en esta vista</Text>
          </View> */}

          {/* <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalCategories}</Text>
            <Text style={styles.statLabel}>categorias detectadas</Text>
          </View> */}

          {/* <View style={styles.statCard}>
            <Text numberOfLines={1} style={styles.statValueText}>
              {selectedCategory}
            </Text>
            <Text style={styles.statLabel}>categoria activa</Text>
          </View> */}

          {/* <View style={styles.statCard}>
            <Text style={styles.statValue}>{favoriteIds.length}</Text>
            <Text style={styles.statLabel}>favoritos guardados</Text>
          </View> */}

          {/* <View style={styles.statCard}>
            <Text numberOfLines={1} style={styles.statValueText}>
              {sortMode === 'name' ? 'Nombre' : 'Categoria'}
            </Text>
            <Text style={styles.statLabel}>orden actual</Text>
          </View> */}
        </View>
      </View>

       <View style={styles.searchContainer}>     
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
      />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchSortRow}>
          <View style={styles.sortGroup}>
            <Pressable
              onPress={() => onSelectSortMode('name')}
              style={({ pressed, focused }) => [
                styles.sortButton,
                sortMode === 'name' && styles.sortButtonSelected,
                focused && styles.sortButtonFocused,
                pressed && styles.sortButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortMode === 'name' && styles.sortButtonTextSelected,
                ]}
              >
                Ordenar por nombre
              </Text>
            </Pressable>

            <Pressable
              onPress={() => isCategorySortEnabled && onSelectSortMode('group')}
              disabled={!isCategorySortEnabled}
              focusable={isCategorySortEnabled}
              accessibilityState={{ disabled: !isCategorySortEnabled }}
              style={({ pressed, focused }) => [
                styles.sortButton,
                sortMode === 'group' && styles.sortButtonSelected,
                !isCategorySortEnabled && styles.sortButtonDisabled,
                focused && styles.sortButtonFocused,
                pressed && styles.sortButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortMode === 'group' && styles.sortButtonTextSelected,
                  !isCategorySortEnabled && styles.sortButtonTextDisabled,
                ]}
              >
                Ordenar por categoria
              </Text>
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar canal, categoria o id"
              placeholderTextColor="#777"
              style={styles.searchInput}
            />

            {searchQuery.trim() ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed && styles.clearButtonPressed,
                ]}
              >
                <Text style={styles.clearButtonText}>Limpiar</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

    {/* REEMPLAZAR EL <ChannelGrid /> POR ESTO: */}
      {channelsLoading ? (
        <View style={styles.centerMessageContainer}>
          <ActivityIndicator size="large" color="#ff7a1a" />
          <Text style={styles.messageText}>Cargando canales...</Text>
        </View>
      ) : channelsError ? (
        <View style={styles.centerMessageContainer}>
          <Text style={styles.errorTitle}>Error al cargar</Text>
          <Text style={styles.messageText}>{channelsError}</Text>
          <Pressable
            hasTVPreferredFocus
            onPress={() => onRetryChannels().catch(() => undefined)}
            style={({ focused }) => [
              styles.retryButton,
              focused && styles.retryButtonFocused
            ]}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <ChannelGrid
          channels={channels}
          selectedChannelId={selectedChannel}
          onChannelPress={handleChannelPress}
          emptyMessage={emptyMessage}
          groupByCategory={sortMode === 'group'}
        />
      )}
      {/* HASTA ACÁ */}

      <Modal
        animationType="fade"
        transparent
        visible={isExitDialogVisible}
        onRequestClose={handleCancelExit}
      >
        <View style={styles.exitDialogBackdrop}>
          <View style={styles.exitDialog}>
            <Text style={styles.exitDialogTitle}>
              ¿Quiere salir de la aplicación?
            </Text>

            <Pressable
              onPress={() => setShouldLogoutOnExit(value => !value)}
              disabled={isExiting}
              style={({ focused, pressed }) => [
                styles.logoutSwitchRow,
                focused && styles.dialogControlFocused,
                pressed && styles.dialogControlPressed,
                isExiting && styles.dialogControlDisabled,
              ]}
            >
              <Switch
                value={shouldLogoutOnExit}
                onValueChange={setShouldLogoutOnExit}
                disabled={isExiting}
                focusable={false}
                thumbColor={shouldLogoutOnExit ? '#ffffff' : '#d8d8d8'}
                trackColor={{ false: '#555', true: '#ff7a1a' }}
              />
              <Text style={styles.logoutSwitchText}>Cerrar sesión</Text>
            </Pressable>

            <View style={styles.exitDialogActions}>
              <Pressable
                onPress={handleConfirmExit}
                disabled={isExiting}
                style={({ focused, pressed }) => [
                  styles.exitDialogButton,
                  styles.exitButton,
                  focused && styles.dialogControlFocused,
                  pressed && styles.dialogControlPressed,
                  isExiting && styles.dialogControlDisabled,
                ]}
              >
                <Text style={styles.exitDialogButtonText}>
                  {isExiting ? 'Saliendo...' : 'Salir'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleCancelExit}
                disabled={isExiting}
                hasTVPreferredFocus
                style={({ focused, pressed }) => [
                  styles.exitDialogButton,
                  styles.cancelButton,
                  focused && styles.dialogControlFocused,
                  pressed && styles.dialogControlPressed,
                  isExiting && styles.dialogControlDisabled,
                ]}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },

  hero: {
    paddingHorizontal: 30,
    paddingTop: 16,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 18,
  },

  brandLogo: {
    width: 150,
    height: 48,
  },

  clock: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
centerMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#ff4444',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#333',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  retryButtonFocused: {
    borderColor: '#ff7a1a',
    backgroundColor: '#444',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  title: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '800',
  },

  subtitle: {
    color: '#b8b8b8',
    fontSize: 17,
    lineHeight: 24,
    marginTop: 10,
    maxWidth: 620,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 20,
    flexWrap: 'wrap',
    
  },

  statCard: {
    minWidth: 120,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },

  statValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  statValueText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },

  statLabel: {
    color: '#a8a8a8',
    fontSize: 13,
    marginTop: 4,
  },

  searchContainer: {
    paddingHorizontal: 30,
    paddingTop: 4,
    paddingBottom: 6,
  },

  searchRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchSortRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  sortGroup: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flexShrink: 1,
  },

  searchInput: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#2f2f2f',
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 18,
  },

  clearButton: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#363636',
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearButtonPressed: {
    opacity: 0.82,
  },

  clearButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  sortRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },

  sortButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sortButtonSelected: {
    backgroundColor: '#f0f0f0',
    borderColor: '#f0f0f0',
  },

  sortButtonFocused: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.08 }],
  },

  sortButtonDisabled: {
    backgroundColor: '#121212',
    borderColor: '#2a2a2a',
    opacity: 0.6,
  },

  sortButtonPressed: {
    opacity: 0.85,
  },

  sortButtonText: {
    color: '#e0e0e0',
    fontSize: 14,
    fontWeight: '700',
  },

  sortButtonTextSelected: {
    color: '#111',
  },

  sortButtonTextDisabled: {
    color: '#777',
  },

  exitDialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  exitDialog: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 8,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    padding: 28,
  },

  exitDialogTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },

  logoutSwitchRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    marginTop: 26,
    paddingHorizontal: 14,
  },

  logoutSwitchText: {
    color: '#f2f2f2',
    fontSize: 18,
    fontWeight: '700',
  },

  exitDialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    marginTop: 30,
  },

  exitDialogButton: {
    minWidth: 136,
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  exitButton: {
    backgroundColor: '#2b2b2b',
    borderColor: '#4a4a4a',
  },

  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderColor: '#f0f0f0',
  },

  exitDialogButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  cancelButtonText: {
    color: '#111',
    fontSize: 17,
    fontWeight: '800',
  },

  dialogControlFocused: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.04 }],
  },

  dialogControlPressed: {
    opacity: 0.86,
  },

  dialogControlDisabled: {
    opacity: 0.55,
  },
});
