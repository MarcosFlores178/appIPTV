import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    setIsLoading(true);
    setIsBuffering(false);
    setErrorMessage(null);
  }, [channel.id, channel.url]);

  const handleBuffer = ({ isBuffering: nextIsBuffering }: OnBufferData) => {
    setIsBuffering(nextIsBuffering);
  };

  return (
    <View style={styles.playerShell}>
      <View style={styles.videoCard}>
        <Video
          source={{
            uri: channel.url,
            bufferConfig: {
              minBufferMs: 15000,
              maxBufferMs: 50000,
              bufferForPlaybackMs: 2500,
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
            setIsBuffering(false);
          }}
          onBuffer={handleBuffer}
          onError={event => {
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
                  {isBuffering ? 'Buffering del stream...' : 'Cargando stream...'}
                </Text>
              </>
            )}
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
