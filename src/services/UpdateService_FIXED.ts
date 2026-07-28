import { Alert, NativeModules, Platform } from 'react-native';
import { ApiError, getApiUrl } from './api';

interface AppVersionInfo {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  forceUpdate: boolean;
}

const { UpdateModule } = NativeModules as {
  UpdateModule?: {
    getCurrentVersionCode: () => Promise<number>;
    downloadAndInstallApk: (apkUrl: string, versionName: string) => Promise<boolean>;
  };
};

export const getCurrentAppVersionCode = async (): Promise<number> => {
  if (Platform.OS !== 'android') {
    throw new Error('El sistema de actualización solo está disponible en Android.');
  }

  if (!UpdateModule?.getCurrentVersionCode) {
    throw new Error('El módulo nativo de actualización no está disponible.');
  }

  return UpdateModule.getCurrentVersionCode();
};

export const fetchAppVersion = async (): Promise<AppVersionInfo> => {
  const response = await fetch(await getApiUrl('/api/app/version'), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(8000), // ✅ TIMEOUT DE 8 SEGUNDOS AGREGADO
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const code = typeof payload?.error === 'string' ? payload.error : 'VERSION_REQUEST_FAILED';
    const message = typeof payload?.message === 'string' ? payload.message : 'No se pudo obtener la metadata de la app.';
    throw new ApiError(message, response.status, code);
  }

  return response.json() as Promise<AppVersionInfo>;
};

export const downloadAndInstallApk = async (apkUrl: string, versionName: string): Promise<void> => {
  if (Platform.OS !== 'android') {
    throw new Error('La instalación de APK solo está disponible en Android.');
  }

  if (!UpdateModule?.downloadAndInstallApk) {
    throw new Error('El módulo nativo de actualización no está disponible.');
  }

  await UpdateModule.downloadAndInstallApk(apkUrl, versionName);
};

export const checkForAppUpdate = async (): Promise<void> => {
  try {
    const [currentVersionCode, remoteVersion] = await Promise.all([
      getCurrentAppVersionCode(),
      fetchAppVersion(),
    ]);

    if (remoteVersion.versionCode <= currentVersionCode) {
      return;
    }

    const performUpdate = async () => {
      await downloadAndInstallApk(remoteVersion.apkUrl, remoteVersion.versionName);
    };

    if (remoteVersion.forceUpdate) {
      await performUpdate();
      return;
    }

    Alert.alert(
      'Actualización disponible',
      `Se detectó una nueva versión ${remoteVersion.versionName}. Deseas actualizar ahora?`,
      [
        {
          text: 'Actualizar ahora',
          onPress: performUpdate,
        },
        {
          text: 'Más tarde',
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn('No se pudo consultar versión de app:', error.message);
      return;
    }

    // ✅ MANEJO DE TIMEOUT AGREGADO
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Timeout al verificar versión de app');
      return;
    }

    console.warn('Error en el sistema OTA:', error);
  }
};
