# 架構與資料界線

React 19 + TypeScript + Vite，React Router、Dexie、vite-plugin-pwa、Lucide；樣式使用單一可維護 CSS design system，避免額外執行時樣式相依。未採 Tailwind，是同等輕量的實作選擇。

## 資料流

`data.ts → React 畫面` 提供版本化靜態行程。所有卡片具有 PDF 頁碼、核實狀態、備註與來源 ID。`docs/itinerary.json` 是維護匯出，App 不從外部下載未受控 JSON。

`表單 → 驗證 → IndexedDB` 儲存帳本、匯率、預算、卡片自訂時間、備註、排序、私人文字與行李勾選。金額是整數 JPY；每筆保留獨立 TWD/JPY 匯率，設定更新不回算歷史消費。每日／全程預算均以 JPY 表示；台幣總計是每筆換算後加總。

`城市／日期 → Open-Meteo → 有限快取 → 畫面`；API 使用 timeout、狀態碼、結構驗證。只接受京都／大阪，並行去重，失敗有退避，過去或超過 15 天日期不呼叫。快取標示取得時間，24 小時後清除／拒用。每日預報不冒充每個景點的即時天氣。

## 資料庫 v2（備份仍為 schema 1）

v1 → v2 升級會將空白私人名稱補為「未命名私人資料」，保留原內容與帳本。畫面透過 Dexie liveQuery 訂閱同來源的跨分頁變動；消費編輯與刪除在交易內比較編輯前快照，拒絕過時表單覆寫或復活刪除資料。CSV 直接讀最新資料庫，JSON 採一致交易快照。

寫入與匯入合併後均驗證完整備份：5 MB UTF-8 位元組、10,000 筆消費、100 筆私人資料。超限交易回滾。舊備份空白名稱可保留內容並補名。儲存開啟失敗或 5 秒內未就緒會顯示唯讀模式，靜態行程、住宿及緊急資訊仍可讀；不會自動清除資料。

| Table       | 主鍵    | 索引 / 內容                                    |
| ----------- | ------- | ---------------------------------------------- |
| expenses    | id      | date, category；JPY、該筆匯率、名稱、更新時間  |
| settings    | id      | settings 單一列；手動匯率、全程與每日 JPY 預算 |
| edits       | stop id | 自訂 time、note；不改原書資料                  |
| orders      | day id  | 完整 stop id 順序                              |
| privateInfo | id      | 標籤與文字；packing 保留給行李清單             |

JSON schema v1 包含以上五類資料。5 MB / 10,000 筆消費上限。先驗證日期、金額、分類、排序完整性、欄位長度，剝除多餘欄位，再在同一 Dexie transaction 合併。DB schema 新增必須以 Dexie 新版本 migration 進行，不可在 Service Worker 更新時 deleteDatabase。

## 離線及更新

天氣畫面每 5 分鐘檢查，回前景也更新時鐘；實際請求仍受 30 分鐘節流限制。取得超過 30 分鐘、觀測超過 1 小時或離線資料不再標為目前氣溫；滿 24 小時不再顯示快取。跨日重新評估行程及預報範圍。

Workbox 預快取 build JS、CSS、HTML、manifest、圖示（約 518 KiB）；版本 revision 決定更新。導航 fallback 到 index.html。沒有天氣 runtime cache，沒有地圖圖磚、個人資料或 PDF 的 Service Worker 快取。天氣 localStorage 與 IndexedDB 各有獨立界線，App 更新不會清除帳本。

採 prompt 更新，使用者儲存後點「更新 App」，新版接管並重載。伺服器 sw.js、index.html、manifest 必須 no-cache，雜湊 assets 長效快取。

## 安全與擴充

精確個人成本僅保留在 private，不包含在公開程式、JSON、文件或 ZIP。日期、航班、飯店及排定時間仍可由公開版本取得，部署前需使用者授權。

沒有 AI API、Maps API key、Firebase client key 或私人訂位代碼。私人文字僅本機，React 純文字呈現；不使用 dangerouslySetInnerHTML。CSV 防止公式注入，JSON 不執行程式碼。Firebase 部署 CSP 只允許同源腳本、同源資源與 Open-Meteo 連線。所有外部連結 rel=noreferrer。

未來雲端同步可在 `db.ts` 的驗證／匯入匯出邊界加入 repository adapter，將本機 id 作穩定識別，並增加 ownerId、deletedAt、revision 與衝突策略。Authentication／Firestore 未連線、未啟用，不會自動上傳個資。新增同步前須另行設計離線衝突、登入權限與安全規則。

## Design system

米白 paper、白色 card、低飽和綠主色、朱紅警示。`--paper/--card/--ink/--muted/--line` 等 token 在深色媒體查詢覆寫。景點／餐飲／交通／購物均有文字與圖示，顏色只輔助辨識。手機底列支援 safe-area，主要按鈕至少 44 px；文字可系統放大，輸入採 16 px 避免 iOS 自動縮放。沒有外部字型或裝飾圖片依賴，主視覺為程式內 SVG。
