import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages 的 Project Pages 網址格式是：https://<帳號>.github.io/<repo名稱>/
// 部署時資源路徑需要加上 /<repo名稱>/ 前綴，本機開發（npm run dev）則維持 "/" 不受影響。
// 做法：把下面的 REPO_NAME 換成你的 GitHub repo 名稱即可（大小寫需一致）。
// 如果是 User/Organization Pages（repo 名稱為 <帳號>.github.io），則 base 應維持 "/"。
const REPO_NAME = "swim-core-trainer";
const BASE_PATH = process.env.GITHUB_ACTIONS ? `/${REPO_NAME}/` : "/";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // manifest 內的圖示路徑用相對路徑，搭配 vite 的 base 設定，
      // 本機（"/"）與 GitHub Pages 子路徑（"/REPO_NAME/"）都能正確解析。
      manifest: {
        id: BASE_PATH,
        scope: BASE_PATH,
        start_url: BASE_PATH,
        name: "泳隊陸上核心訓練",
        short_name: "核心訓練",
        description: "泳隊陸上核心訓練引導 App，倒數＋語音帶領完成整套訓練。",
        lang: "zh-TW",
        display: "standalone",
        orientation: "any",
        background_color: "#0B2A4A",
        theme_color: "#1E88D6",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // app shell（JS/CSS/HTML/icons）安裝時預先快取；
        // 動作照片檔案大小不一（使用者自行提供，可能數 MB），改用下面的 runtimeCaching
        // 在使用者實際看到該動作時才快取，避免安裝當下就強制下載全部照片。
        globPatterns: ["**/*.{js,css,html,ico,svg,png}"],
        globIgnores: ["exercises/**"],
        runtimeCaching: [
          {
            urlPattern: /\/exercises\/.*\.png$/,
            handler: "CacheFirst",
            options: {
              cacheName: "exercise-images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: BASE_PATH,
  server: {
    host: true, // 允許同網段的平板用電腦 IP 連線（npm run dev）
    port: 5173,
  },
});
