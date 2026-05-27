import React from 'react';
import {
  ImageBackground,
  SafeAreaView,
  StyleSheet,
} from 'react-native';

const splashBackground = require('../../assets/branding/splash-image.png');

export default function AppSplashScreen() {
  return (
    <ImageBackground
      source={splashBackground}
      resizeMode="cover"
      style={styles.background}
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* <View style={styles.overlay}>
          <View style={styles.content}>
            <Image source={appLogo} resizeMode="contain" style={styles.logo} />
            <Text style={styles.tagline}>TV en vivo, simple y lista para usar</Text>
          </View>
        </View> */}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#050505',
  },

  backgroundImage: {
    opacity: 0.82,
  },

  safeArea: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 5, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 520,
    height: 160,
    maxWidth: '90%',
  },

  tagline: {
    color: '#e6e6e6',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 18,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
});
