import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_SERVER_KEY = '@EstranetTV:backend-server';
const CONFIG_VERSION_KEY = '@EstranetTV:config-version';
const DEFAULT_BACKEND_PORT = '4000';

export const DEFAULT_PUBLIC_IP = '181.209.79.77';
export const DEFAULT_PRIVATE_IP = '192.168.130.22';
export const CONFIG_VERSION = 1;

export const DEFAULT_BACKEND_SERVER_INPUT = DEFAULT_PRIVATE_IP;

export class BackendConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendConfigError';
  }
}

const hasHttpProtocol = (value: string) => /^https?:\/\//i.test(value);

export const normalizeBackendServerInput = (value: string): string => {
  const trimmedValue = value.trim().replace(/\/+$/, '');

  if (!trimmedValue) {
    throw new BackendConfigError('Ingresá el servidor backend.');
  }

  if (hasHttpProtocol(trimmedValue)) {
    const urlWithoutProtocol = trimmedValue.replace(/^https?:\/\//i, '');

    if (!urlWithoutProtocol || urlWithoutProtocol.includes(' ')) {
      throw new BackendConfigError('Ingresá una URL de servidor válida.');
    }

    return trimmedValue;
  }

  if (trimmedValue.includes('/')) {
    throw new BackendConfigError('Ingresá solo el host o una URL completa.');
  }

  const hostWithPort = trimmedValue.includes(':')
    ? trimmedValue
    : `${trimmedValue}:${DEFAULT_BACKEND_PORT}`;

  return `http://${hostWithPort}`;
};

export const getBackendServerInput = async (): Promise<string> => {
  const [storedValue, storedVersion] = await Promise.all([
    AsyncStorage.getItem(BACKEND_SERVER_KEY),
    AsyncStorage.getItem(CONFIG_VERSION_KEY),
  ]);

  const version = storedVersion ? parseInt(storedVersion, 10) : 0;

  // Si la versión es vieja o no existe, forzamos la IP por defecto del código
  if (version < CONFIG_VERSION) {
    return DEFAULT_BACKEND_SERVER_INPUT;
  }

  return storedValue || DEFAULT_BACKEND_SERVER_INPUT;
};

export const getBackendBaseUrl = async (): Promise<string> =>
  normalizeBackendServerInput(await getBackendServerInput());

export const saveBackendServerInput = async (value: string): Promise<string> => {
  const trimmedValue = value.trim().replace(/\/+$/, '');
  const normalizedValue = normalizeBackendServerInput(trimmedValue);

  await Promise.all([
    AsyncStorage.setItem(BACKEND_SERVER_KEY, trimmedValue),
    AsyncStorage.setItem(CONFIG_VERSION_KEY, CONFIG_VERSION.toString()),
  ]);

  return normalizedValue;
};
