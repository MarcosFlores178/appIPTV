import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const appLogo = require('../../assets/branding/app-logo.png');

interface LoginScreenProps {
  errorMessage?: string | null;
  isLoading: boolean;
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function LoginScreen({
  errorMessage,
  isLoading,
  onLogin,
}: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (isLoading) {
      return;
    }

    onLogin(username.trim(), password).catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        <Image source={appLogo} resizeMode="contain" style={styles.logo} />
        <Text style={styles.title}>Ingresar</Text>
        <Text style={styles.copy}>Usa tu usuario para habilitar este TV.</Text>

        <View style={styles.form}>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Usuario"
            placeholderTextColor="#777"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            style={styles.input}
          />

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor="#777"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            secureTextEntry
            style={styles.input}
          />

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={isLoading || !username.trim() || !password}
            hasTVPreferredFocus
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
