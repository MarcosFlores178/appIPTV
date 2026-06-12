import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Video, { ResizeMode, type OnBufferData } from 'react-native-video';
import { IPTVChannel } from '../types/iptv';

interface TVPlayerProps {
  channel: IPTVChannel;
}

export default function TVPlayer({ channel }: TVPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showChannelName, setShowChannelName] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [playerKey, setPlayerKey] = useState(0);
  
  const channelNameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasBufferingRef = useRef(false);
  const maxRetries = 3;

  useEffect(() => {
    setIsLoading(true);
    setIsBuffering(false);
    setErrorMessage(null);
    setShowChannelName(false);
    setHasPlaybackStarted(false);
    setRetryCount(0);
    setPlayerKey(prev => prev + 1);
    wasBufferingRef.current = false;

    if (channelNameTimerRef.current) {
      clearTimeout(channelNameTimerRef.current);
      channelNameTimerRef.current = null;
    }

    return () => {
      if (channelNameTimerRef.current) {
        clearTimeout(channelNameTimerRef.current);
        channelNameTimerRef.current = null;
      }
    };
  }, [channel.id, channel.url]);

  // Mostrar el nombre cuando el buffering se complete después de haber empezado
  useEffect(() => {
    if (hasPlaybackStarted && !isBuffering && wasBufferingRef.current) {
      // El video pasó de buffering a reproduciendo normalmente
      if (channelNameTimerRef.current) {
        clearTimeout(channelNameTimerRef.current);
      }

      setShowChannelName(true);
      channelNameTimerRef.current = setTimeout(() => {
        setShowChannelName(false);
        channelNameTimerRef.current = null;
      }, 3000);

      wasBufferingRef.current = false;
    }

    if (isBuffering) {
      wasBufferingRef.current = true;
    }
  }, [isBuffering, hasPlaybackStarted]);

  const handleBuffer = ({ isBuffering: nextIsBuffering }: OnBufferData) => {
    setIsBuffering(nextIsBuffering);
  };

  return (
    <View style={styles.playerShell}>
      <View style={styles.videoCard}>
        <Video
          key={`${channel.id}-${playerKey}`}
          source={{
            uri: channel.url,
            // 🔽 AQUÍ AÑADIMOS EL USER AGENT AMIGABLE 🔽
            headers: {
              'User-Agent': "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
            },
            bufferConfig: {
              minBufferMs: 25000,
              maxBufferMs: 60000,
              bufferForPlaybackMs: 3000,
              bufferForPlaybackAfterRebufferMs: 5000,
            },
          }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          controls={false}
          paused={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          onLoadStart={() => {
            setIsLoading(true);
            setErrorMessage(null);
          }}
          onLoad={() => {
            setIsLoading(false);
            setHasPlaybackStarted(true);
            setRetryCount(0); // Reset retry on success
          }}
          onBuffer={handleBuffer}
          onError={event => {
            if (retryCount < maxRetries) {
              console.log(`Playback error, retrying (${retryCount + 1}/${maxRetries})...`);
              setIsLoading(true);
              setRetryCount(prev => prev + 1);
              setPlayerKey(prev => prev + 1);
              return;
            }

            setIsLoading(false);
            setIsBuffering(false);
            setErrorMessage(
              event.error.errorString ||
                event.error.localizedDescription ||
                'No se pudo reproducir este stream.',
            );
          }}
        />

        {(isLoading || isBuffering || errorMessage) && (
          <View style={styles.statusOverlay}>
            {errorMessage ? (
              <>
                <Text style={styles.errorTitle}>No se pudo abrir el canal</Text>
                <Text style={styles.errorCopy}>{errorMessage}</Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.statusText}>
                  {isBuffering
                    ? 'Buffering del stream...'
                    : 'Cargando stream...'}
                </Text>
              </>
            )}
          </View>
        )}

        {showChannelName && !errorMessage && (
          <View pointerEvents="none" style={styles.channelNameOverlay}>
            <Text style={styles.channelNameText}>{channel.name}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  playerShell: {
    flex: 1,
    backgroundColor: '#000',
  },

  videoCard: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 0,
  },

  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },

  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  channelNameOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 42,
    alignItems: 'center',
    paddingHorizontal: 28,
  },

  channelNameText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },

  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 14,
  },

  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },

  errorCopy: {
    color: '#d2d2d2',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
    maxWidth: 640,
  },

  infoCard: {
    borderRadius: 18,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    padding: 24,
  },

  title: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
  },

  subtitle: {
    color: '#cfcfcf',
    fontSize: 18,
    marginTop: 8,
  },

  description: {
    color: '#b4b4b4',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 18,
  },

  metaCard: {
    borderRadius: 18,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#2c2c2c',
    padding: 20,
  },

  metaLabel: {
    color: '#a1a1a1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  metaValue: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
  },
});
