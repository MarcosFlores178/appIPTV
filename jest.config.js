module.exports = {
  preset: 'react-native',
  // Permitir transformar algunos módulos de node_modules que usan sintaxis modern
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-async-storage)/)'
  ],
  setupFiles: ["<rootDir>/jest.setup.js"],
};
