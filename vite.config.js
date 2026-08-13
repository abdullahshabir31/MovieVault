import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { VitePWA } from "vite-plugin-pwa";

function stripRouteTreeTypeFooter() {
  return {
    name: "strip-route-tree-ts-footer",
    enforce: "pre",

    load(id) {
      if (!id.includes("routeTree.gen.js")) return null;
      const fs = require("node:fs");
      const code = fs.readFileSync(id.split("?")[0], "utf-8");
      const cut = code.indexOf("\nimport type");
      if (cut === -1) return null;
      return code.slice(0, cut) + "\n";
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  plugins: [
    tailwindcss(),

    tanstackStart({
      server: {
        entry: "server",
      },

      router: {
        entry: "router.jsx",
        disableTypes: true,
        routeTreeFileFooter: [],
      },
    }),

    viteReact(),

    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Movie Vault",
        short_name: "Movie Vault",
        description: "Your personal movie vault",
        theme_color: "#16181f",
        background_color: "#16181f",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),

    stripRouteTreeTypeFooter(),
  ],
});
