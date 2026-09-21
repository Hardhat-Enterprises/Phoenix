import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget =
    env.VITE_API_GATEWAY_PROXY_TARGET || "http://localhost:3001";

  return {
    plugins: [react()],
    // Unit tests run in jsdom so the notification panel's focus and keyboard
    // behaviour can be exercised the way a reader would.
    test: {
      environment: "jsdom",
      globals: true,
      include: ["src/**/*.test.{js,jsx}"],
      restoreMocks: true,
    },
    server: {
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/health": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});