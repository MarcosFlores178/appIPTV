import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';
import Video, { ResizeMode, type OnBufferData } from 'react-native-video';
import { IPTVChannel } from '../types/iptv';

interface TVPlayerProps {
  channel: IPTVChannel;
}

export default function TVPlayer({ channel }: TVPlayerProps) {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showChannelName, setShowChannelName] = useState(false);
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [playerKey, setPlayerKey] = useState(0);
  
  const channelNameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRetries = 5;

  useEffect(() => {
    setIsBuffering(false);
    setErrorMessage(null);
    setShowChannelName(false);
    setHasPlaybackStarted(false);
    setRetryCount(0);
    
    const clearAllTimers = () => {
      if (channelNameTimerRef.current) {
        clearTimeout(channelNameTimerRef.current);
        channelNameTimerRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    clearAllTimers();

    return () => {
      clearAllTimers();
    };
  }, [channel.id, channel.url]);

  useEffect(() => {
    // Si no estamos en proceso de reconexión, no interceptamos el botón nativo
    if (retryCount === 0) {
      return;
    }

    const backAction = () => {
      console.log('Usuario abortó la reconexión. Limpiando timer de reintento...');
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      return false; // Permite que la navegación vuelva a la grilla normalmente
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => {
      backHandler.remove();
    };
  }, [retryCount]);

  // Mostrar el nombre cuando el buffering se complete después de haber empezado
  useEffect(() => {
    if (hasPlaybackStarted) {
      // El video pasó de buffering a reproduciendo normalmente
      if (channelNameTimerRef.current) {
        clearTimeout(channelNameTimerRef.current);
      }

      setShowChannelName(true);

      channelNameTimerRef.current = setTimeout(() => {
        setShowChannelName(false);
        channelNameTimerRef.current = null;
      }, 3000);

    }
  }, [hasPlaybackStarted]);

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
              minBufferMs: 15000,
              maxBufferMs: 30000,
              bufferForPlaybackMs: 500,
              bufferForPlaybackAfterRebufferMs: 5000,
            },
          }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          controls={false}
          focusable={false} 
          paused={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          onLoadStart={() => {
            setIsInitialLoad(true);
            // setIsBuffering(false); // 🚀 Resetear el buffer fantasma al iniciar el zap
            setErrorMessage(null);
          }}
          onLoad={() => {
            setIsInitialLoad(false); // Ya cargó, el video está listo
            setHasPlaybackStarted(true);
          }}
          onReadyForDisplay={() => {
            // El primer frame del video ya es visible en la TV
            setRetryCount(0);
            setIsBuffering(false); // 🚀 Forzar el apagado por si el evento nativo falló
            if (retryTimerRef.current) {
              clearTimeout(retryTimerRef.current);
              retryTimerRef.current = null;
            }
          }}
          onBuffer={handleBuffer}
          onError={event => {
            if (retryCount < maxRetries) {
              const nextRetry = retryCount + 1;
              const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
              
              console.log(`Playback error, retrying in ${delay}ms (${nextRetry}/${maxRetries})...`);
              
              setRetryCount(nextRetry);
              
              if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
              retryTimerRef.current = setTimeout(() => {
                setPlayerKey(prev => prev + 1);
                retryTimerRef.current = null;
              }, delay);
              
              return;
            }

            setIsBuffering(false);
            setErrorMessage(
              event.error.errorString ||
                event.error.localizedDescription ||
                'No se pudo reproducir este stream.',
            );
          }}
        />

        {/* Solo mostramos el overlay si hay error o si se quedó sin buffer (isBuffering nativo) */}
        {(isInitialLoad || isBuffering || errorMessage) && (
          <View style={styles.statusOverlay} pointerEvents="none"> 
            {errorMessage ? (
              <>
                <Text style={styles.errorTitle}>No se pudo abrir el canal</Text>
                <Text style={styles.errorCopy}>{errorMessage}</Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color="#ffffff" />
                
        {/* Solo mostramos texto si el reproductor está en ciclo de reintento activo */}
        {retryCount > 0 && (
          <Text style={styles.statusText}>
            Reconectando... ({retryCount}/{maxRetries})
          </Text>
        )}
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },

  video: {
    ...StyleSheet.absoluteFillObject,
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
    // textShadowColor: '#000',
    // textShadowOffset: { width: 0, height: 2 },
    // textShadowRadius: 5,
    // 🔽 AQUÍ ESTÁ EL CAMBIO 🔽
    textShadowColor: 'rgba(0, 0, 0, 0.95)', // Sombra negra casi opaca
    textShadowOffset: { width: 1, height: 2 }, // Un poquito de offset lateral también
    textShadowRadius: 1.5, // 👈 BAJAMOS EL RADIO para que la sombra sea "dura" y actúe como borde
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

  
});
