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
      // This app has no index.html (TanStack Start renders the shell
      // server-side), so VitePWA's default HTML-injected registration
      // script never runs. Register manually via `virtual:pwa-register`
      // instead — see the effect in src/routes/__root.jsx.
      injectRegister: false,
      outDir: ".output/public",
      includeAssets: ["favicon.ico", "favicon.png", "icons/*.png"],
      // Switched from the default generateSW strategy to injectManifest so
      // src/sw.js can add its own "push" / "notificationclick" listeners —
      // generateSW only lets you configure caching, not custom event
      // handlers, and web push notifications need those.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      injectManifest: {
        globDirectory: ".output/public",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
      },
    }),
  ],
});
