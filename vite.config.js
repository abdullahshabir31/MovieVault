import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
      router: {
        entry: "router.jsx",
      },
    }),
    nitro(),
    viteReact(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      outDir: ".output/public",
      includeAssets: ["favicon.ico", "favicon.png", "icons/*.png"],
      workbox: {
        globDirectory: ".output/public",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
      },
    }),
  ],
});
