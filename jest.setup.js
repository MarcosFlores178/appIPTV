// Setup file for Jest to mock native modules used in tests

// Evitar error por NativeEventEmitter sin módulo nativo
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  return function NativeEventEmitter() {
    return {
      addListener: () => ({ remove: () => {} }),
      removeAllListeners: () => {},
      emit: () => {},
    };
  };
});

// Mock básico de react-native-device-info
jest.mock('react-native-device-info', () => ({
  getManufacturer: jest.fn(() => Promise.resolve('Unknown')),
  getModel: jest.fn(() => Promise.resolve('Unknown')),
  getSystemName: jest.fn(() => 'Android'),
  getSystemVersion: jest.fn(() => '0'),
}));

// Mock AsyncStorage to avoid native dependency issues in tests
jest.mock('@react-native-async-storage/async-storage', () => {
  let storage = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key) => storage[key] ?? null),
      setItem: jest.fn(async (key, value) => { storage[key] = value; }),
      removeItem: jest.fn(async (key) => { delete storage[key]; }),
      clear: jest.fn(async () => { storage = {}; }),
    },
  };
});
