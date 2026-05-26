const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo SDK 56 enables unstable_enablePackageExports by default, which causes
// Metro to resolve @supabase/supabase-js via its `exports` field using the
// `import` condition → dist/index.mjs (ESM). That file contains a dynamic
// import() with webpack magic comments that Hermes cannot compile.
// Disabling package exports makes Metro fall back to the `main` field
// (dist/index.cjs), which is CommonJS and has no dynamic import().
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
