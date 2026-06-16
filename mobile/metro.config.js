const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Expo SDK 56 enables unstable_enablePackageExports by default, which causes
// Metro to resolve @supabase/supabase-js via its `exports` field using the
// `import` condition → dist/index.mjs (ESM). That file contains a dynamic
// import() with webpack magic comments that Hermes cannot compile.
// Disabling package exports makes Metro fall back to the `main` field
// (dist/index.cjs), which is CommonJS and has no dynamic import().
config.resolver.unstable_enablePackageExports = false;

// react-native-worklets uses require.resolveWeak('react-native-worklets') inside
// its own source to get a lazy bundle reference. Metro can't resolve this
// self-reference without an explicit alias pointing to the package entry.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-worklets': path.resolve(__dirname, 'node_modules/react-native-worklets'),
};

module.exports = config;
