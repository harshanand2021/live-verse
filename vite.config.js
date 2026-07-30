import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // REST calls to Spring Core (auth, rooms, seats, messages, playback)
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      // WebSocket connections to Quarkus (chat, playback events, reactions, presence)
      "/ws": {
        target: "ws://localhost:8081",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
