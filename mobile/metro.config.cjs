const { getDefaultConfig } = require("expo/metro-config");

// expo-sqlite's web worker loads a WebAssembly module; Metro must treat .wasm
// as a resolvable asset on web builds.
const config = getDefaultConfig(__dirname);
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, "wasm"])];

module.exports = config;
