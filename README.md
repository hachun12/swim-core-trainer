# 泳隊陸上核心訓練引導 App

給少年游泳選手的陸上核心訓練引導：設定課表 → 大畫面倒數引導 → 語音提示 → 完成。
以 React + Vite 開發，可部署成 PWA 安裝於平板／手機。

## 需要先安裝
- Node.js 18 以上（建議 20 或 22）

## 快速開始
```bash
npm install      # 安裝相依套件
npm run dev      # 本機開發（會顯示網址，例如 http://localhost:5173）
```

### 在平板上執行（開發階段）
1. 電腦與平板連同一個 Wi-Fi。
2. 執行 `npm run dev`，終端機會列出一個 Network 網址，例如 `http://192.168.0.10:5173`。
3. 用平板瀏覽器打開這個網址即可。

### 正式打包與部署
```bash
npm run build    # 產出 dist/ 靜態檔
npm run preview  # 本機預覽打包結果
```
把 `dist/` 上傳到任一靜態空間（Netlify、Vercel、GitHub Pages 等）取得 https 網址，
用平板瀏覽器開啟後，透過瀏覽器的「加入主畫面」即可像 App 一樣全螢幕使用。

> 語音提示與螢幕常亮（Wake Lock）需在 https 或 localhost 環境、且使用者按下「開始」後才會啟用，這在正式部署後即正常運作。

### 部署到 GitHub Pages（已內建自動部署）

專案已附上 GitHub Actions 工作流程（`.github/workflows/deploy.yml`），推上 `main` 分支會自動打包並部署，不需手動操作。

**第一次設定（只需做一次）：**
1. 把專案推到 GitHub repo（例如建立一個叫 `swim-core-trainer` 的 repo）。
2. **確認 `vite.config.js` 裡的 `REPO_NAME` 與你的 repo 名稱完全一致**（大小寫也要一致）。若 repo 名稱不同，請修改這個常數。
   - 例外：如果你的 repo 名稱就是 `你的帳號.github.io`（User/Organization Pages），請把 `base` 直接改成 `"/"`。
3. 到 GitHub repo 的 **Settings → Pages**，「Build and deployment」的 Source 選擇 **GitHub Actions**（不要選 "Deploy from a branch"）。
4. `git push` 到 `main` 分支後，到 repo 的 **Actions** 分頁可看到自動執行的部署流程，完成後網址會是：
   ```
   https://<你的帳號>.github.io/<repo名稱>/
   ```
5. 之後每次 `git push` 到 `main`，都會自動重新打包部署，不需要再手動操作。

**用平板安裝**：部署完成後用平板瀏覽器開啟上面的網址，透過「加入主畫面」即可全螢幕使用，效果等同 App。

## 放入動作圖片（PNG）
把每個動作的圖片放進 `public/exercises/`，**檔名對應動作 id**：
- 例如動作 `streamline-plank` → `public/exercises/streamline-plank.png`
- 找不到檔案時，畫面自動改顯示該動作的 emoji 圖標，不會出錯。

內建動作需要的檔名清單見 `public/exercises/README.txt`。
自訂動作可在 App 表單的「動作圖片檔名」欄位指定對應檔名。

圖片會在**休息預告畫面大圖顯示**（提示下一個動作），動作進行中則以小縮圖顯示。

## 資料保存
- 課表與自訂動作會自動存到瀏覽器的 localStorage，重開仍在。
- 內建動作由程式碼提供，不佔用儲存空間。

## 專案結構
```
swim-core-trainer/
├─ index.html
├─ package.json
├─ vite.config.js
├─ public/
│  └─ exercises/          # 放動作 PNG（檔名 = 動作 id）
└─ src/
   ├─ main.jsx
   ├─ index.css
   └─ App.jsx             # 主程式（設定頁 + 訓練引擎 + 動作庫）
```

## 主要功能
- 課表彈性設定：階段、輪數、順序、每個動作的時間與休息秒數
- 大畫面環形倒數、整體進度、冷暖色即狀態（動作／休息一眼分辨）
- 語音提示：進入動作播報、進行中每 15 秒輪播提示、最後 3 秒嗶聲、休息時預告下一動作
- 動作庫：新增／編輯動作、指定 PNG 圖片、退階做法與危險提醒
- 訓練中可暫停、上一個／下一個、重新開始
