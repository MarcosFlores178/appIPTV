import React, { useState } from 'react';
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  Image,
} from 'react-native';
import { IPTVChannel } from '../types/iptv';

interface ChannelCardProps {
  channel: IPTVChannel;
  isSelected?: boolean;
  onPress: (channel: IPTVChannel) => void;
}

export default function ChannelCard({
  channel,
  isSelected = false,
  onPress,
}: ChannelCardProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onPress={() => onPress(channel)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hasTVPreferredFocus={isSelected}
      style={({ pressed }) => [
        styles.card,
        focused && styles.cardFocused,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.logoContainer}>
        {channel.logo ? (
          <Image
            source={{ uri: channel.logo }}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.logoPlaceholder}>TV</Text>
        )}
      </View>

      <Text numberOfLines={2} style={styles.channelName}>
        {channel.name}
      </Text>
      <Text numberOfLines={1} style={styles.channelGroup}>
        {channel.group}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 136,
    minWidth: 110,
    maxWidth: 140,
    height: 144,
    marginVertical: 6,
    marginHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#1e1e1e',
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    transform: [{ scale: 1 }],
  },

  cardFocused: {
    borderColor: '#ffffff',
    backgroundColor: '#2d2d2d',
    transform: [{ scale: 1.08 }],
  },

  cardPressed: {
    opacity: 0.85,
  },

  logoContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    width: '90%',
    height: 75,
  },

  logoPlaceholder: {
    color: '#999',
    fontSize: 24,
    fontWeight: 'bold',
  },

  channelName: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },

  channelGroup: {
    color: '#999',
    fontSize: 11,
    marginTop: 4,
  },
});
