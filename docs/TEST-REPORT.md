# 驗收報告 · 2026-10-25

## 稽核修復後的最新版結果

Lint、Type Check、Production Build 通過；Vitest **23／23**、Playwright **48／48**（四組環境，約 3.7 分鐘）、強化後 Service Worker 更新與離線新版重載測試均通過。npm audit 為 0 個已知漏洞。

六項 P1 與兩項 P2 的程式修復、回歸案例及未驗證界線見 [部署前稽核修復](AUDIT-FIXES.md)。原始完成報告未涵蓋的備份、跨分頁、儲存失效、長時間天氣與導航問題已納入新測試。正式部署、遠端權限與 iPhone 真機仍未驗證。

## 以下保留初版歷史紀錄

下方的 15／28 數字及初版修正紀錄屬先前版本；最新版以本頁上方與 AUDIT-FIXES 為準。

結論：**本機正式版本可驗收，正式 HTTPS 部署與 iPhone 真機仍待授權／人工驗證。** 原始 PDF 的預約與時刻矛盾仍需憑證確認，不宣稱完整旅遊安排已全部核實。

## 最終檢查結果

| 檢查                           | 實際結果                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------ |
| ESLint                         | 通過，0 errors                                                                 |
| TypeScript                     | 通過，Production Build 亦含 type check                                         |
| Vitest                         | 2 個檔案、15 / 15 通過                                                         |
| Playwright 最終單工全套        | **28 / 28 通過，約 2.8 分鐘**                                                  |
| 真實 Service Worker 更新 smoke | 通過，新 worker → 更新提示 → 重載 → 原消費仍存在                               |
| npm audit（含開發相依）        | 0 個已知漏洞                                                                   |
| Open-Meteo 真實連線            | HTTP 200，timezone=Asia/Tokyo，16 日；2026/10/25–11/9                          |
| 原始碼／部署界線               | private、node_modules、dist、測試 profile、備份由 Git ignore 排除；部署僅 dist |

曾有一次平行全套最後的桌面測試在 browser context 清理逾時；單獨重跑成功，之後**整套單工重新執行 28 / 28 成功**。沒有忽略或跳過失敗測試。更新 smoke 也加入固定執行時間與連線清理，避免測試程序無限等待。

## 測試環境

Windows、Node.js v24.19.0、npm 11.17.0。Playwright 實際下載的 Chromium / WebKit；使用 iPhone 13 預設模擬設定（兩引擎）、iPad Pro 11、Desktop Chrome 四組。另以 390×844 persistent context 實際關閉並重新開啟瀏覽器 profile 驗證 IndexedDB。這些都是桌面上的模擬環境，**不是實體 iPhone**。

## 28 項瀏覽器案例（每組 7 項 × 4 組環境）

1. 七日切換、卡片數量、清水寺 Google Maps URL、修改時間／備註、調整順序、重載持久化。
2. SW 控制後關網，離線新增消費、重載仍在、修改金額、匯出 JSON／CSV、刪除及匯入恢復；離線開啟深連結行程。
3. persistent browser profile：新增紀錄、關閉整個 context／browser process、相同 profile 重新啟動，紀錄仍存在。
4. 五個頁面在淺／深色模式無橫向溢出；長日文與私人文字、頁面截圖、沒有 uncaught page errors；私人測試字串沒有進入任何網路請求。
5. manifest standalone、3 種宣告圖示可讀、預快取包含 index、不含天氣／private；離線重新進資訊頁及讀攻略。
6. 指定測試天氣：日期、氣溫、降雨提醒、30 分鐘快取、離線上次資料標示、過期日期不顯示預報。
7. 五個主頁 × 淺深色 axe WCAG 2 A/AA、2.1 AA 自動掃描沒有違規。僅代表所掃畫面通過自動規則，不等於人工無障礙認證。

瀏覽器離線模式為 Playwright `context.setOffline(true)`；不是只檢查 `navigator.onLine` 字樣。重開測試使用 persistent profile，不以 storageState 截圖模擬持久化。

## 15 項單元案例

- 帳本 CRUD／重開、五類資料 JSON 完整往返、損毀資料拒絕、重複匯入去重、原筆匯率保持、無效金額／日期／分類拒絕、CSV 引號與公式注入。
- 七天連續、星期、ID／頁碼、來源引用、Google Maps 正確編碼。
- 日本跨日與下一個定時項目、16 日範圍、天氣格式與狀況。
- API 並行去重／30 分鐘節流、錯誤回應與失敗退避、離線 stale 與 24 小時 TTL、超期與未知城市不發請求。

天氣自動化案例採明確 fixture；產品程式沒有 fixture 天氣。真實 API 另外實際驗證連線與回應日期。

## 已主動修復

- 備份預設設定共用物件可能被呼叫端修改，改為獨立副本。
- 天氣記憶快取超過 24 小時仍可能回傳，補上 TTL 拒用與清除；增加並行請求去重、回應驗證。
- 淺色次要文字對比、深色 root 寫死色彩、日期選擇器深色對比，均修正後掃描通過。
- 台灣去程 15:25 換算時間軸日本 16:25，原機票時間仍明確保留。
- 原書回程交通方向、特急與急行區別、機場報到動線，附官方來源及原頁說明。
- 導航不對未知集合點、未具名宵夜或跨國航班生成誤導步行路線。
- 初始測試套件有已知漏洞，升級後 npm audit 為 0。

## 建置與離線體積

正式主 JS 約 458.22 kB（gzip 約 154.20 kB），CSS 約 33.31 kB（gzip 約 7.41 kB）；預快取 14 項約 514.47 KiB。無外部字型、AI API 或 Maps JS。這是 build 量測，未宣稱 Lighthouse 分數或真實行動網路載入時間。

## 待完成 / 不宣稱已通過

- GitHub 遠端建立／Push、Actions 在 GitHub runner 實際執行；目前只有工作流設定。
- Firebase 帳戶登入、指定／建立 Project、公開部署、真實 HTTPS URL、CSP／快取標頭外網驗證。
- 實體 iPhone Safari 與主畫面 App 安裝、分享選單、安全區域、鍵盤、跨 App 導航／撥號、重開後資料。
- KKday 正確集合地點／時間、弘燒肉／午餐／遊船／USJ 真實憑證與旅客資料。
- 旅行當日列車班次／月台／末班、餐廳臨時店休、場次與交通中斷。
- 部分未具名餐點與無法查證價格／營業時間，App 保留未知。

## 重現命令

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e -- --workers=1
node scripts/update-smoke.mjs
npm audit
```

人工可從本機 http://127.0.0.1:4173 檢查。公開網路與真機驗收不應用 localhost 測試代替。
