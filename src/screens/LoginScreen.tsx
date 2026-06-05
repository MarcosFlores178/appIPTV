import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

const appLogo = require('../../assets/branding/app-logo.png');

interface LoginScreenProps {
  initialServer: string;
  errorMessage?: string | null;
  isLoading: boolean;
  onLogin: (username: string, password: string, server: string) => Promise<void>;
}

export default function LoginScreen({
  initialServer,
  errorMessage,
  isLoading,
  onLogin,
}: LoginScreenProps) {
  const [server, setServer] = useState(initialServer);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isServerEditableMode, setIsServerEditableMode] = useState(false);
  
  const serverRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const loginButtonRef = useRef<any>(null);

  useEffect(() => {
    // Al montar, enfocar en el campo usuario (o servidor si está en modo edición)
    if (isServerEditableMode) {
      serverRef.current?.focus();
    } else {
      usernameRef.current?.focus();
    }
  }, [isServerEditableMode]);

  const handleSubmit = () => {
    if (isLoading) {
      return;
    }

    onLogin(username.trim(), password, server).catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Image source={appLogo} resizeMode="contain" resizeMethod="resize" style={styles.logo} />
        <Text style={styles.title}>Ingresar</Text>
        <Text style={styles.copy}>Usa tu usuario para habilitar este TV.</Text>

        <View style={styles.form}>
          <View style={styles.serverToggleRow}>
            <Switch
              value={isServerEditableMode}
              onValueChange={setIsServerEditableMode}
              thumbColor={isServerEditableMode ? '#ffffff' : '#d8d8d8'}
              trackColor={{ false: '#555', true: '#ff7a1a' }}
              disabled={isLoading}
            />
            <Text style={styles.serverToggleLabel}>Seleccionar servidor</Text>
          </View>

          <TextInput
            ref={serverRef}
            value={server}
            onChangeText={setServer}
            placeholder="Servidor backend"
            placeholderTextColor="#777"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading && isServerEditableMode}
            keyboardType="url"
            onSubmitEditing={() => usernameRef.current?.focus()}
            returnKeyType="next"
            style={[styles.input, !isServerEditableMode && styles.inputDisabled]}
          />

          <TextInput
            ref={usernameRef}
            value={username}
            onChangeText={setUsername}
            placeholder="Usuario"
            placeholderTextColor="#777"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            onSubmitEditing={() => passwordRef.current?.focus()}
            returnKeyType="next"
            style={styles.input}
          />

          <TextInput
            ref={passwordRef}
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor="#777"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            secureTextEntry
            onSubmitEditing={() => loginButtonRef.current?.focus()}
            returnKeyType="done"
            style={styles.input}
          />

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <Pressable
            ref={loginButtonRef}
            onPress={handleSubmit}
            disabled={
              isLoading || !server.trim() || !username.trim() || !password
            }
            style={({ pressed, focused }) => [
              styles.loginButton,
              focused && styles.loginButtonFocused,
              pressed && styles.loginButtonPressed,
              (isLoading || !username.trim() || !password) &&
                styles.loginButtonDisabled,
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.loginButtonText}>Entrar</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  panel: {
    width: 420,
    maxWidth: '100%',
  },

  logo: {
    width: 190,
    height: 60,
    alignSelf: 'center',
    marginBottom: 24,
  },

  title: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },

  copy: {
    color: '#bdbdbd',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
    textAlign: 'center',
  },

  form: {
    gap: 14,
    marginTop: 28,
  },

  serverToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    marginBottom: 4,
  },

  serverToggleLabel: {
    color: '#bdbdbd',
    fontSize: 14,
    fontWeight: '500',
  },

  input: {
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#333',
    color: '#fff',
    fontSize: 17,
    paddingHorizontal: 16,
  },

  inputDisabled: {
    opacity: 0.5,
    backgroundColor: '#0f0f0f',
    borderColor: '#222',
  },

  errorText: {
    color: '#ffb4aa',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  loginButton: {
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },

  loginButtonFocused: {
    borderColor: '#ffffff',
    transform: [{ scale: 1.04 }],
  },

  loginButtonPressed: {
    opacity: 0.86,
  },

  loginButtonDisabled: {
    opacity: 0.55,
  },

  loginButtonText: {
    color: '#111',
    fontSize: 17,
    fontWeight: '800',
  },
});
