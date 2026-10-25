# 旅日手帖 · 京都大阪七日 PWA

把 2026/10/31–11/6 京都大阪旅遊書轉成手機旅行工具。七天 68 張卡片、12 篇本地攻略、44 個研究來源，保留 PDF 頁碼與未知／矛盾標示。個人預約不進入公開前端。

## 本機開啟

需要 Node.js 24 LTS 與 npm。

```powershell
cd D:\codex\APP\japan-travel
npm ci
npm run dev
```

開啟終端機顯示的 localhost 網址。正式版：

```powershell
npm run build
npm run preview -- --port 4173
```

開啟 http://127.0.0.1:4173 。`dist/` 為可部署的正式靜態資源；不能用檔案總管雙擊 HTML 執行 PWA。若已在此來源安裝過 Service Worker，開發介面可能顯示舊快取；使用預覽版更新提示或另一個 localhost port，請勿清除已記帳的網站資料。

## 功能

部署前稽核修復：私人名稱驗證與舊資料升級、完整備份容量檢查、跨分頁即時同步與消費衝突保護、儲存失效唯讀模式、天氣定期／前景檢查、導航模式修正及公開成本清理。見 [修復驗收](docs/AUDIT-FIXES.md)。

- 今日：日本日期、目前時間、當日時間軸與下一個定時項目；旅程外標為預覽／回顧。
- 行程：七天切換、分類搜尋、來源頁碼、時間與備註編輯、上下排序與本機保存。
- 地圖：按行程順序的地點／地址清單，使用免費 Google Maps URLs 外部步行或大眾運輸導航。矛盾地點不產生猜測導航。
- 記帳：Dexie / IndexedDB 離線 CRUD、自訂每筆 TWD/JPY 匯率、每日／全程 JPY 預算、分類統計、CSV、JSON 備份與驗證後交易式匯入。
- 資訊：航班、日文飯店地址、電話、私人訂位、緊急協助、行李勾選、12 篇攻略、44 個來源與原書差異。
- 天氣：Open-Meteo，最多 16 日、Asia/Tokyo、30 分鐘節流、同城市並行去重、錯誤後 5 分鐘暫停重試，最多兩城市 24 小時快取，離線資料明標時間。
- PWA：manifest、192/512 圖示與 iOS 圖示、靜態預快取、版本更新提示與離線深連結。

## iPhone 安裝與資料備份

1. 用 Safari 開啟正式 **HTTPS** 網址。
2. 分享 → 加入主畫面 → 新增。
3. 首次保持連線下載靜態資源，之後以飛航模式確認行程可讀、可記帳。
4. 在記帳頁先設定手動匯率。原書成本不自動當成實付消費。
5. 定期匯出 JSON 到「檔案」。換手機或清除網站資料會失去未備份內容。

JSON 含私人資料，未加密，不可公開分享。匯入採 ID 合併，同 ID 覆寫，並更新匯率及預算，其他紀錄保留；先備份原資料。整份驗證通過才交易式寫入，失敗不部分覆寫。Safari 網頁與主畫面 App 可能有不同儲存環境，請在長期使用的環境記帳。iPhone 真機尚未驗證。

## 品質檢查

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e -- --workers=1
node scripts/update-smoke.mjs
npm audit
```

Playwright 使用正式 `dist/`，測試含真實 Service Worker 離線、persistent browser profile 關閉再開、資料備份、四種瀏覽環境、深淺色與 axe 掃描。天氣預報情境使用明確測試 fixture，另有真實 API 連線驗證，並未把測試天氣寫入產品。

詳見 [測試報告](docs/TEST-REPORT.md)、[PDF 稽核](docs/PDF-AUDIT.md)、[來源索引](docs/SOURCES.md)、[架構說明](docs/ARCHITECTURE.md)、[部署步驟](docs/DEPLOYMENT.md)。

## 資料與維護

- `src/data.ts`：行程、研究、來源、矛盾的唯一維護來源。
- `src/model.ts`：資料模型；卡片含原書頁碼、狀態、查證來源 IDs。
- `docs/itinerary.json` / `docs/research.json`：供檢查或其他工具使用的結構化匯出。
- 修改來源後執行 `node scripts/export-data.mjs`，再重新建置與測試。
- `private/`：OCR、原頁與本機私人種子備份，全部由 Git 排除，不能複製到 `public/`。

`private/首次匯入_PDF固定成本參考.json` 可在首次使用時，從記帳頁匯入，將原書費用保留成私人備註，**不會產生實付消費**。這份檔案的預算／匯率預設為 0；已有記帳設定時先匯出備份，避免覆蓋既有設定。私人種子不在原始碼或正式版 ZIP 內。

## 雲端狀態

Firebase Hosting 設定與 GitHub Actions 已準備。尚未建立 GitHub Repository、Push、建立 Firebase Project 或公開部署；需使用者授權及帳戶存取。`production` 環境應設定人工審核，部署工作流僅接受手動啟動。
