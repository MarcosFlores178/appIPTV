import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DEFAULT_PRIVATE_IP, DEFAULT_PUBLIC_IP } from '../services/backendConfig';

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
  
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const loginButtonRef = useRef<View>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  // Función auxiliar para validar si el formulario es válido
  const isFormValid = () => {
    return !isLoading && server.trim() && username.trim() && password;
  };

  const handleSubmit = () => {
    if (!isFormValid()) {
      return;
    }
    Keyboard.dismiss(); // Asegura que el teclado se cierre al procesar
    onLogin(username.trim(), password, server).catch(() => undefined);
  };

  return (
  <View style={styles.container}>
    <View style={styles.panel}>
      <Image source={appLogo} resizeMode="contain" resizeMethod="resize" style={styles.logo} />
      <Text style={styles.title}>Ingresar</Text>
      <Text style={styles.copy}>Selecciona tu red e ingresa tus credenciales.</Text>

      <View style={styles.form}>
        <View style={styles.quickSelectContainer}>
          <Pressable
            onPress={() => !isLoading && setServer(DEFAULT_PRIVATE_IP)}
            disabled={isLoading}
            nextFocusDown={usernameRef.current|| undefined}
            style={({ focused }) => [
              styles.quickButton,
              focused && styles.quickButtonFocused,
              server === DEFAULT_PRIVATE_IP && styles.quickButtonActive,
            ]}
          >
            <Text
              style={[
                styles.quickButtonText,
                server === DEFAULT_PRIVATE_IP && styles.quickButtonTextActive,
              ]}
            >
              Red Local
            </Text>
          </Pressable>

          <Pressable
            onPress={() => !isLoading && setServer(DEFAULT_PUBLIC_IP)}
            disabled={isLoading}
            style={({ focused }) => [
              styles.quickButton,
              focused && styles.quickButtonFocused,
              server === DEFAULT_PUBLIC_IP && styles.quickButtonActive,
            ]}
          >
            <Text
              style={[
                styles.quickButtonText,
                server === DEFAULT_PUBLIC_IP && styles.quickButtonTextActive,
              ]}
            >
              Internet
            </Text>
          </Pressable>
        </View>

        <TextInput
          ref={usernameRef}
          value={username}
          onChangeText={setUsername}
          placeholder="Usuario"
          placeholderTextColor="#777"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          onSubmitEditing={() => {
            passwordRef.current?.focus();
          }}
          blurOnSubmit={false}
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
          submitBehavior="blurAndSubmit" // Reemplaza a blurOnSubmit={true}
          returnKeyType="done"
          style={styles.input}
          onSubmitEditing={() => {
            // Ya no hace falta Keyboard.dismiss() acá porque blurAndSubmit lo maneja
            if (isFormValid()) {
              handleSubmit();
            }
          }}
        />

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <Pressable
          ref={loginButtonRef as any}
          onPress={handleSubmit}
          disabled={!isFormValid()}
          focusable={true} // Forzamos a que el sistema operativo de la TV lo reconozca como enfocable
          style={({ pressed, focused }) => [
            styles.loginButton,
            focused && styles.loginButtonFocused,
            pressed && styles.loginButtonPressed,
            !isFormValid() && styles.loginButtonDisabled,
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

  quickSelectContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },

  quickButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickButtonFocused: {
    borderColor: '#fff',
    backgroundColor: '#222',
    transform: [{ scale: 1.02 }],
  },

  // quickButtonActive: {
  //   backgroundColor: '#ff7a1a22',
  //   borderColor: '#ff7a1a',
  // },

  // quickButtonText: {
  //   color: '#aaa',
  //   fontSize: 14,
  //   fontWeight: '600',
  // },

  // quickButtonTextActive: {
  //   color: '#ff7a1a',
  // },

// Opción 2: Combinación mixta
quickButtonActive: {
  backgroundColor: '#9cd36922',
  borderColor: '#0082c5',
},
quickButtonText: {
  color: '#aaa',  // Neutro
  fontSize: 14,
  fontWeight: '600',
},
quickButtonTextActive: {
  color:'#0082c5',
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
