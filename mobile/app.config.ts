import { ExpoConfig, ConfigContext } from "expo/config";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:5000";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "KitchenPulse",
  slug: "kitchenpulse",
  version: "1.0.0",
  orientation: "landscape",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.kitchenpulse.app",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0F172A",
    },
    package: "com.kitchenpulse.app",
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro",
  },
  extra: {
    backendUrl,
  },
});
