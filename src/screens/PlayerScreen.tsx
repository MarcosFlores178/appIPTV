import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  useTVEventHandler,
  View,
} from 'react-native';
import TVPlayer from '../components/TVPlayer';
import ChannelCard from '../components/ChannelCard';
import { saveLastChannelId } from '../services/storage';
import { IPTVChannel } from '../types/iptv';

const SIDEBAR_CHANNEL_ITEM_HEIGHT = 146;

interface PlayerScreenProps {
  channel: IPTVChannel;
  channels: IPTVChannel[];
  onBack: () => void;
  onChangeChannel: (channel: IPTVChannel) => void;
  isFavorite: boolean;
  onToggleFavorite: (channel: IPTVChannel) => void;
}

export default function PlayerScreen({
  channel,
  channels,
  onBack,
  onChangeChannel
  
}: PlayerScreenProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const selectedChannelIndex = useMemo(() => {
    const channelIndex = channels.findIndex(item => item.id === channel.id);

    return channelIndex >= 0 ? channelIndex : 0;
  }, [channel.id, channels]);

  const changeChannelByOffset = useCallback(
    (offset: number) => {
      if (channels.length === 0) {
        return;
      }

      const currentIndex = channels.findIndex(item => item.id === channel.id);
      const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex =
        (safeCurrentIndex + offset + channels.length) % channels.length;
      const nextChannel = channels[nextIndex];

      saveLastChannelId(nextChannel.id).catch(() => undefined);
      onChangeChannel(nextChannel);
    },
    [channel.id, channels, onChangeChannel],
  );

  useTVEventHandler((event: any) => {
    const type =
      event?.eventType || event?.direction || event?.keyAction || event?.eventKeyAction;

    if (!type) {
      return;
    }

    const normalized = String(type).toLowerCase();

    if (
      normalized.includes('select') ||
      normalized.includes('ok') ||
      normalized.includes('enter')
    ) {
      if (!isPanelOpen) {
        setIsPanelOpen(true);
      }

      return;
    }

    if (isPanelOpen) {
      return;
    }

    if (normalized.includes('up') || normalized.includes('right')) {
      changeChannelByOffset(1);
      return;
    }

    if (normalized.includes('down') || normalized.includes('left')) {
      changeChannelByOffset(-1);
    }
  });

  useEffect(() => {
    const handleBackPress = () => {
      if (isPanelOpen) {
        setIsPanelOpen(false);
        return true;
      }

      onBack();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    return () => subscription.remove();
  }, [isPanelOpen, onBack]);

  const handleChannelChange = async (selectedChannel: IPTVChannel) => {
    await saveLastChannelId(selectedChannel.id).catch(() => undefined);
    onChangeChannel(selectedChannel);
    setIsPanelOpen(false);
  };

  return (
    <View style={styles.container}>
      <TVPlayer channel={channel} />

      {isPanelOpen && (
        <View style={styles.panelOverlay}>
          <View style={styles.panelBackdrop} />
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>Lista de canales</Text>

            <FlatList
              data={channels}
              keyExtractor={item => item.id}
              numColumns={1}
              initialScrollIndex={selectedChannelIndex}
              getItemLayout={(_, index) => ({
                length: SIDEBAR_CHANNEL_ITEM_HEIGHT,
                offset: SIDEBAR_CHANNEL_ITEM_HEIGHT * index,
                index,
              })}
              contentContainerStyle={styles.channelListContent}
              extraData={channel.id}
              renderItem={({ item }) => (
                <ChannelCard
                  channel={item}
                  isSelected={item.id === channel.id}
                  onPress={handleChannelChange}
                />
              )}
              initialNumToRender={16}
              maxToRenderPerBatch={12}
              windowSize={7}
              removeClippedSubviews
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    
  },

  panelOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  panelBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },

  sidebar: {
    width: 200,
    backgroundColor: '#111',
    borderLeftWidth: 1,
    borderLeftColor: '#222',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  channelRow: {
    justifyContent: 'flex-start',
  },

  sidebarTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },

  searchRow: {
    marginBottom: 16,
  },

  searchInput: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1c1c1c',
    color: '#fff',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2f2f2f',
    fontSize: 15,
  },

  channelCount: {
    color: '#c0c0c0',
    fontSize: 13,
    marginBottom: 10,
  },

  channelList: {
    flex: 1,
  },

  channelListContent: {
    paddingBottom: 24,
  },

  channelItem: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#171717',
  },

  channelItemFocused: {
    borderColor: '#fff',
    borderWidth: 1,
    transform: [{ scale: 1.01 }],
  },

  channelItemSelected: {
    backgroundColor: '#272727',
    borderColor: '#fff',
    borderWidth: 1,
  },

  channelItemPressed: {
    opacity: 0.85,
  },

  channelName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  channelGroup: {
    color: '#9c9c9c',
    fontSize: 12,
    marginTop: 4,
  },

  channelSeparator: {
    height: 10,
  },



  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },

  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteButton: {
    backgroundColor: '#5f4500',
  },

  buttonLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
