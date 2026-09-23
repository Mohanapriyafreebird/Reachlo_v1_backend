const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Required for react-native-reanimated 4.x and react-native-worklets
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

// Support additional file extensions
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'mjs', 'cjs'],
};

module.exports = config;
