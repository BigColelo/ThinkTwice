// ThinkTwice Metro configuration.
// Owned entirely by this repository — it extends only Expo's public defaults.
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// `expo-sqlite` runs on web through a WebAssembly build of SQLite. Metro must be
// told to treat `.wasm` as an asset, otherwise the web bundle fails to resolve it.
config.resolver.assetExts.push('wasm');

// That WebAssembly build stores the database in the browser's origin-private
// file system, which requires cross-origin isolation. These headers enable it
// for the local dev server; a deployed web build needs the same two headers
// from its host.
//
// `enhanceMiddleware` is marked deprecated by Metro but is still the only hook
// it exposes for response headers; revisit when a replacement lands.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    middleware(req, res, next);
  };
};

module.exports = config;
