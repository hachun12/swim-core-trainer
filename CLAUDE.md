# CLAUDE.md — 泳隊陸上核心訓練引導 App（給 AI coding agent 的專案指示）

> 這份文件放在專案根目錄，Claude Code（VS Code）會自動讀取當作專案指示。
> 目的：讓你（AI agent）快速理解現況，並**安全地接手完成待辦任務**，過程中不破壞既有功能。

---

## 0. 如何使用這份文件

1. 先讀完「專案現況」「架構重點」「開發守則」三節，建立正確心智模型。
2. 到「待完成任務」挑選任務實作。任務已標好優先序（P1 最高）。**你可以逐項完成，每完成一項就跑一次 `npm run build` 確認可編譯。**
3. 使用者（非工程師）會用繁體中文下指令；所有 UI 文字、語音內容一律**繁體中文**。
4. 若某項任務不需要或使用者另有指示，以使用者當下的指令為準；這份清單是建議，可增刪。

---

## 1. 專案現況

一個給少年游泳選手的「陸上核心訓練引導」App。使用者（家長／教練）先設定課表，啟動後以**大畫面倒數＋語音**引導孩子完成整套動作。

- 技術：**React 18 + Vite 5**，純前端、無後端。
- 狀態：**可正常 `npm run build` 編譯，功能可運作。**
- 已完成並可用的功能：
  - 設定頁：階段／輪數／動作順序／每個動作的時間與休息秒數，皆可調；即時預估總時長。
  - 動作庫：新增／編輯動作（含內建動作），可指定 PNG 圖片、退階做法、危險提醒；自訂動作可刪除。
  - 訓練引導頁：狀態機（準備→動作→休息→輪間休息→完成）、環形大倒數、整體進度、冷暖色即狀態。
  - 語音：進入動作播報、進行中每 15 秒輪播提示、最後 3 秒嗶聲、休息時預告下一動作（Web Speech API，`zh-TW`）。
  - 螢幕常亮（Wake Lock）、暫停／上一個／下一個／重新開始。
  - 課表與自訂動作以 localStorage 持久化。
  - **已設定部署到 GitHub Pages**：`.github/workflows/deploy.yml`（push 到 `main` 自動打包部署）、`vite.config.js` 已依 GitHub Actions 環境自動切換 `base` 路徑。詳見第 4.6 節與第 6 節 P1-A。

---

## 2. 技術與執行

- 需求：Node.js 18+（建議 20 或 22）。
- 指令：
  - `npm install`：安裝相依。
  - `npm run dev`：本機開發（已設 `host: true`，同網段平板可用電腦 IP 連線）。
  - `npm run build`：正式打包到 `dist/`。**每次修改後請執行以確認可編譯。**
  - `npm run preview`：預覽打包結果。
- 相依：`react`、`react-dom`、`lucide-react`（圖示）。新增相依請務必更新 `package.json`，並避免引入不必要的重量級套件。

---

## 3. 檔案地圖

```
swim-core-trainer/
├─ index.html              # 進入點，載入 Google Fonts（Fredoka / Nunito）
├─ vite.config.js          # Vite + React plugin，server.host = true；GitHub Pages base 路徑設定（見 4.6）
├─ package.json
├─ .github/workflows/
│  └─ deploy.yml           # GitHub Actions：push main 自動 build + 部署到 GitHub Pages
├─ public/
│  └─ exercises/           # 動作 PNG，檔名 = 動作 id（見第 4 節）
│     └─ README.txt        # 需要的檔名清單
└─ src/
   ├─ main.jsx             # React 掛載點
   ├─ index.css            # 全域 reset、full-height 版面
   └─ App.jsx              # ★主程式，幾乎所有邏輯都在這（單一檔）
```

`src/App.jsx` 內的主要區塊（由上而下）：
- `EXERCISES`：內建動作資料（seed）。
- `DEFAULT_ROUTINE`：預設 30 分鐘課表。
- `buildSegments(routine, lib)` / `totalSeconds(routine, lib)`：把課表攤平成 segment 陣列。
- `THEME`：各狀態的配色。
- `SwimTrainerApp`（default export）：持有 `routine`、`library`、`view` 狀態與 localStorage 持久化。
- `Editor`：設定頁 + 動作挑選面板 + 動作新增/編輯表單。
- `Stepper`：加減步進器元件。
- `ExerciseVisual`：動作視覺（PNG 或 emoji fallback，支援 `fit`）。
- `Trainer`：訓練引擎（狀態機、語音、嗶聲、Wake Lock）。
- `S`：所有 inline 樣式物件；`CSS`：注入的字型與 keyframes。

---

## 4. 架構重點（動手前務必理解）

### 4.1 資料模型
- **動作 Exercise**：`{ name, emoji, category('warmup'|'core'|'cooldown'), keyPoints[], voiceCues[], regression?, dangerSigns?, image?, builtin }`。
- **動作庫 library**：`{ [id]: Exercise }`。內建動作在 seed 時補上 `image = '/exercises/<id>.png'` 與 `builtin: true`。
- **課表 Routine**：`{ name, prepSeconds, phases: [{ name, rounds, roundBreakSeconds, items: [{ id, work, rest }] }] }`。`items[].id` 對應動作庫的 key。
- **Segment**（由 `buildSegments` 產生，執行時用）：`{ type, duration, exercise?, nextExercise?, phaseName?, round?, totalRounds?, workIndex?, totalWork? }`。

### 4.2 訓練引擎狀態機（在 `Trainer`）
- 狀態：`ready → running`，segment 型別 `PREP | WORK | REST | ROUND_BREAK | DONE`；另有 `paused`。
- **計時務必維持「時間戳校正」**：以 `performance.now()` 與 `segStartRef` 計算真實經過秒數（`setInterval` 100ms 只負責觸發計算），**不要改成單純累加**，否則會累積誤差。
- 進入 segment 時 `enterSpeak` 播報；WORK 進行中每 `CUE_INTERVAL`（15 秒）輪播 `voiceCues`；剩 3 秒內每秒嗶聲。
- 切換段落／暫停前呼叫 `window.speechSynthesis.cancel()` 避免語音疊字。
- Wake Lock 只能在使用者手勢（按「開始」）後請求；分頁重新可見時要重新請求（已實作 `visibilitychange`）。

### 4.3 動作圖片慣例
- 圖片放 `public/exercises/`，**檔名 = 動作 id**（例：`streamline-plank.png`）。Vite 會把 `public/` 原樣搬到網站根目錄，程式用 `/exercises/<id>.png` 讀取。
- 顯示一律透過 `ExerciseVisual`；**找不到圖檔（onError）自動退回該動作的 emoji 圖標**，不可讓畫面壞掉。
- `fit` 參數：小縮圖用 `cover`（置中裁切），休息大圖與表單預覽用 `contain`（完整不裁切）。改動顯示時請沿用此規則。
- 內建動作 id：`cat-cow`、`dead-bug`、`bird-dog`、`streamline-plank`、`side-plank-rotation`、`superman-flutter`、`bear-plank-taps`、`hollow-hold`、`cobra-stretch`、`child-pose`。

### 4.4 持久化
- localStorage keys：`sct.routine.v1`（課表）、`sct.customExercises.v1`（**只存自訂動作**，內建動作由程式碼提供）。
- 新增需要保存的資料時，沿用 `sct.*.v1` 命名，並在讀取時 try/catch 容錯。

### 4.5 樣式
- 全部用 inline 樣式物件 `S`；字型與 keyframes 放在注入的 `CSS` 字串。
- 設計語言：童趣圓體字（Fredoka）、泳池水感配色、大字體高對比、圓角。維持這個調性。

---

### 4.6 GitHub Pages 部署（已設定）
- `.github/workflows/deploy.yml`：push 到 `main` 分支時自動 `npm ci` → `npm run build` → 部署 `dist/` 到 GitHub Pages（用 `actions/deploy-pages`，非傳統 gh-pages 分支法）。
- `vite.config.js` 的 `base`：`process.env.GITHUB_ACTIONS` 為真時（即在 CI 內打包）自動套用 `/${REPO_NAME}/`；本機 `npm run dev` / `npm run build` 則維持 `"/"`，不受影響。
- **`REPO_NAME` 常數必須與 GitHub repo 名稱完全一致**（大小寫也算），若使用者改了 repo 名稱、或改用 User/Organization Pages（repo 名為 `<帳號>.github.io`，此時 base 應為 `"/"`），需同步修改 `vite.config.js`。
- 使用者需在 GitHub repo 的 Settings → Pages 把 Source 設為 **GitHub Actions**（一次性設定，不算 agent 任務）。
- 修改任何影響資源路徑的設定（如新增其他靜態資料夾、改變 `public/` 結構）時，務必同時用 `GITHUB_ACTIONS=true npm run build` 本機模擬 CI 環境，確認 `dist/index.html` 內的資源路徑有正確帶上 `/${REPO_NAME}/` 前綴，避免部署後白畫面或圖片 404。

## 5. 開發守則（Guardrails）

- **每次修改後執行 `npm run build`，必須零錯誤才算完成。**
- **不要破壞既有功能**：狀態機、語音時序、localStorage 結構、PNG fallback。修改時優先擴充，避免大改動核心迴圈。
- UI 文字與語音**全繁體中文**；語音 `utterance.lang = 'zh-TW'`。
- 內容面向兒童：**正向、鼓勵、年齡合適**，不得出現不當內容。
- 不使用 `localStorage` 以外的重機制，除非任務明確需要（例如影片）；若資料可能很大（如 base64 圖片）才考慮 IndexedDB，並說明原因。
- 保持 `App.jsx` 可讀；若某功能過大，可拆到 `src/` 下的新檔案，但需維持匯入關係清楚。
- 提交前自我檢查：`npm run build` 通過、無主控台錯誤、既有流程（設定→開始→完成）仍可跑。

---

## 6. 待完成任務（依優先序；可依使用者需求增刪）

### P1-A：PWA 安裝與離線
- 現況：**GitHub Pages 自動部署已設定完成**（見第 4.6 節），此任務只剩 PWA 安裝／離線能力本身。
- 目標：能「加入主畫面」像 App 一樣全螢幕開啟，離線可用。
- 做法提示：使用 `vite-plugin-pwa`，加入 `manifest`（name、icons、`display: standalone`、`theme_color: #1E88D6`、直向或 `any` 方向）與 Service Worker（快取 app shell 與 `public/exercises/` 圖片）。提供至少 192/512 的 icon（可先用簡單佔位圖）。**注意：manifest 的 icon 路徑與 Service Worker 的 scope 需與第 4.6 節的 `base` 路徑（GitHub Pages 子路徑）相容**，本機與 GitHub Actions 兩種 build 都要能正常運作。
- 驗收：`GITHUB_ACTIONS=true npm run build` 後於支援的瀏覽器可看到安裝提示；離線可開啟並完成一次訓練；於實際部署到 GitHub Pages 後再次確認。

### P1-B：多套課表 + 匯出／匯入 JSON
- 目標：可儲存多套課表、切換、複製、刪除；並能匯出單一課表為 JSON、匯入 JSON（方便教練分享給家長）。
- 做法提示：新增課表列表頁（首頁），localStorage 以 `sct.routines.v1` 存陣列，記錄目前選用的 id。匯出下載 `.json`，匯入以檔案選擇讀入並驗證結構。
- 驗收：新增/切換/刪除課表後重開仍在；匯出的 JSON 能被匯入還原。

### P2-A：訓練歷史紀錄
- 目標：每次完成訓練後記錄日期、總時長、完成輪數，於首頁顯示簡單清單或近 30 天堅持狀況。
- 做法提示：完成（DONE）時寫入 `sct.history.v1`。不要做帳號或雲端。
- 驗收：完成訓練後可在歷史看到該筆紀錄。

### P2-B：設定選項（音量／語速／靜音預設）
- 目標：讓使用者調整語音語速、音效音量、預設是否開聲音，存入 localStorage。
- 做法提示：`speechSynthesis` 的 `rate`、Web Audio 的 gain 值抽成可設定；沿用現有 `soundOn` 機制。
- 驗收：調整後於訓練中即時生效並被記住。

### P3：體驗加分（挑選實作）
- 深色模式切換。
- 每日提醒（PWA Notification，需權限與排程，體驗依平台而異，需說明限制）。
- 「僅暖身／僅主菜單」快速模式。
- 動作庫獨立管理頁（與挑選面板分離，方便大量維護）。

### 選配：產生佔位 PNG（若使用者尚未備圖）
- 目標：在 `public/exercises/` 產生 10 張含動作名稱的正方形佔位 PNG（512×512），讓版面先完整，之後再由使用者替換為實拍圖。
- 注意：這是暫時佔位，實拍圖仍由使用者提供；不要覆蓋使用者已放入的檔案。

---

## 7. 給使用者的備圖提醒（非 agent 任務）

- 每個動作放一張 PNG 到 `public/exercises/`，檔名見第 4.3 節與 `public/exercises/README.txt`。
- 建議 512×512 正方形、每張 < 500KB；主體置中（小縮圖會置中裁切）。
- 沒放的動作會自動顯示 emoji，不影響運作。

---

## 8. 建議的起手指令（使用者可直接對 Claude Code 說）

> 「請依 CLAUDE.md 第 6 節的待完成任務，從 P1-A 開始逐項實作。每完成一項就執行 `npm run build` 確認可編譯，並簡述你改了什麼、如何驗證。實作過程請遵守第 5 節開發守則，不要破壞既有功能。」
