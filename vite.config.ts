import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The metrics API only allows CORS from jasoncoon.github.io; proxy it locally.
const proxy = {
  "/social-metrics-api": {
    target: "https://social-metrics.evilgeniuslabs.org",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/social-metrics-api/, ""),
  },
};

// Shared code lives in ../social-metrics/web-core (linked via a file: dependency).
export default defineConfig({
  preview: { proxy },
  base: "./",
  plugins: [react()],
  resolve: {
    // web-core has its own node_modules for type-checking; make sure the app
    // and web-core share one copy of each library at runtime.
    dedupe: ["react", "react-dom", "antd", "@ant-design/icons", "echarts", "dompurify"],
  },
  server: {
    fs: { allow: [".", "../social-metrics"] },
    proxy,
  },
  build: {
    outDir: "docs",
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      input: {
        index: "index.html",
        profile: "profile.html",
        followers: "followers.html",
        posts: "posts.html",
      },
    },
  },
});
