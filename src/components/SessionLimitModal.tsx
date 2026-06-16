import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DeviceSession } from '../types/iptv';

interface SessionLimitModalProps {
  visible: boolean;
  sessions: DeviceSession[];
  isLoading: boolean;
  onSessionSelect: (sessionId: string) => Promise<void>;
  onDismiss: () => void;
}

interface FlatListSession extends DeviceSession {
  _key: string;
}

export default function SessionLimitModal({
  visible,
  sessions,
  isLoading,
  onSessionSelect,
  onDismiss,
}: SessionLimitModalProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const sessionListRef = useRef<FlatList>(null);
  const firstSessionRef = useRef<any>(null);

  useEffect(() => {
    if (!visible || sessions.length === 0) {
      setSelectedSessionId(null);
      return;
    }

    setSelectedSessionId(prev =>
      prev && sessions.some(session => session.id === prev) ? prev : sessions[0].id,
    );
  }, [visible, sessions]);

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Desconocido';
    }
  };

  const handleRevokeSession = async () => {
    if (!selectedSessionId || isRevoking) {
      return;
    }

    setIsRevoking(true);
    try {
      await onSessionSelect(selectedSessionId);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleSessionFocus = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  const renderSession = ({ item }: { item: FlatListSession }) => {
    const isSelected = selectedSessionId === item.id;
    const isFirst = sessions[0]?.id === item.id;

    return (
      <Pressable
        ref={isFirst ? firstSessionRef : undefined}
        hasTVPreferredFocus={isFirst}
        onPress={() => handleSessionFocus(item.id)}
        onFocus={() => handleSessionFocus(item.id)}
        style={({ focused }) => [
          styles.sessionItem,
          isSelected && styles.sessionItemSelected,
          focused && styles.sessionItemFocused,
        ]}
      >
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionDevice}>
            {item.manufacturer} {item.model}
          </Text>
          <Text style={styles.sessionDate}>Último uso: {formatDate(item.lastSeenAt)}</Text>
        </View>
        {isSelected && (
          <View style={styles.selectionIndicator}>
            <Text style={styles.selectionText}>✓</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const flatListSessions: FlatListSession[] = sessions.map(session => ({
    ...session,
    _key: session.id,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Límite de Dispositivos Alcanzado</Text>
          <Text style={styles.subtitle}>
            Selecciona un dispositivo para cerrar su sesión y continuar:
          </Text>

          <FlatList
            ref={sessionListRef}
            data={flatListSessions}
            renderItem={renderSession}
            keyExtractor={item => item._key}
            scrollEnabled={false}
            style={styles.sessionList}
          />

          <View style={styles.buttonContainer}>
            <Pressable
              onPress={handleRevokeSession}
              disabled={!selectedSessionId || isRevoking || isLoading}
              style={({ pressed, focused }) => [
                styles.button,
                styles.revokeButton,
                focused && styles.buttonFocused,
                pressed && styles.buttonPressed,
                (!selectedSessionId || isRevoking || isLoading) && styles.buttonDisabled,
              ]}
            >
              {isRevoking || isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Cerrar Sesión</Text>
              )}
            </Pressable>

            <Pressable
              onPress={onDismiss}
              disabled={isRevoking || isLoading}
              style={({ pressed, focused }) => [
                styles.button,
                styles.cancelButton,
                focused && styles.buttonFocused,
                pressed && styles.buttonPressed,
                (isRevoking || isLoading) && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  container: {
    width: 600,
    maxWidth: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 32,
    gap: 20,
  },

  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },

  subtitle: {
    color: '#bdbdbd',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },

  sessionList: {
    maxHeight: 300,
    marginVertical: 12,
  },

  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#262626',
    borderWidth: 2,
    borderColor: '#333',
  },

  sessionItemSelected: {
    borderColor:'#0082c5' ,
    backgroundColor: 'rgba(255, 122, 26, 0.1)',
  },

  sessionItemFocused: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.02 }],
  },

  sessionInfo: {
    flex: 1,
    gap: 4,
  },

  sessionDevice: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  sessionDate: {
    color: '#999',
    fontSize: 13,
  },

  selectionIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5a678d22',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },

  selectionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  button: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },

  revokeButton: {
    backgroundColor: '#5a678d22',
    borderColor: '#0082c5',
  },

  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: '#0082c5',
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  cancelButtonText: {
    color: '#bdbdbd',
    fontSize: 16,
    fontWeight: '700',
  },

  buttonFocused: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.04 }],
  },

  buttonPressed: {
    opacity: 0.86,
  },

  buttonDisabled: {
    opacity: 0.5,
  },
});
