# 工作階段紀錄

## 部署前稽核修復

- 完成：六項 P1 與兩項 P2 的程式、資料及工作流修復；細節見 AUDIT-FIXES。
- 實測：23／23 單元、48／48 瀏覽器、強化更新測試與本機公開成本掃描通過。
- 未解：正式 HTTPS、GitHub 遠端環境設定、iPhone 真機、真實票券與旅行日營運仍待確認。
- 未執行：Push、雲端資源建立及正式部署。

## Phase 1：專案與 PDF 稽核

- 完成：辨識原工作區為 Python 工具、沒有旅遊 App／Git 遠端／Firebase；建立獨立 japan-travel。
- 實測：pypdf 全部 18 頁無文字層；Poppler 完成全部影像，RapidOCR 全頁辨識與關鍵頁視覺核對。
- 未解：原始票券憑證與 PDF 內部矛盾，列入 PDF-AUDIT。
- 後續：結構化真實資料。

## Phase 2：行程資料

- 完成：2026/10/31–11/6 七日 68 張卡片，含來源頁碼、核實狀態、原始提醒與自由時間選配。
- 實測：日期連續、星期、ID 唯一、頁碼範圍、來源 ID 與導航編碼單元測試通過。
- 未解：集合點、私人訂位、原書互相衝突時間；未猜改。
- 後續：五個分頁與互動。

## Phase 3：手機 UI 與核心功能

- 完成：今日、行程、地圖、記帳、旅遊資訊；編輯、排序、外部導航、深淺色與安全區域。
- 實測：手機 Chromium／WebKit、平板、桌面版面與長日文文字；修正色彩對比與深色 root 背景。
- 未解：iPhone 真機觸控、Safari 系統分享與主畫面儲存需實機驗收。
- 後續：天氣與研究。

## Phase 4：旅遊研究與天氣

- 完成：44 個來源、12 篇本地攻略；修正方向、店型與機場流程，新增免稅新制提醒。
- 實測：真實 Open-Meteo API HTTP 200、Asia/Tokyo、16 日範圍；模擬 API 測試快取、節流、無效回應、過期與離線。
- 未解：旅行當日班次、月台、營業異動、部分餐廳菜單未知。
- 後續：離線記帳與安裝。

## Phase 5：IndexedDB 與 PWA

- 完成：離線 CRUD、預算、匯率、分類統計、CSV／JSON、私人資料、行李清單、manifest、icons、SW、更新提示。
- 實測：斷線寫入、重載、persistent profile 關閉重開、備份合併、損毀檔案拒絕、真實 worker 換版後保留帳本。
- 未解：正式 HTTPS、真機安裝仍待部署。
- 後續：完整品質檢查。

## Phase 6：品質驗收

- 完成：Lint、Type Check、單元測試、Production Build、Playwright、axe 與套件稽核；結果見 TEST-REPORT。
- 曾發現：備份預設物件共用、記憶快取超過 TTL、低對比、深色根樣式。均已修正。
- 曾遇桌面測試清理逾時，單獨重跑通過；最終單工結果另見報告。
- 後續：授權後 GitHub／Firebase 與正式網址驗證。

## Phase 7：GitHub 與正式部署

- 完成：本機 Git、Firebase Hosting 與 CSP 設定、GitHub CI 及手動 production 工作流、部署操作文件。
- 尚未執行：建立遠端、Push、登入／建立 Firebase Project、公開部署。
- 原因：使用者明確要求這些動作先取得授權；尚無 Repo URL、Project ID 與登入權限。
- 授權後：連接指定專案、推送、部署、核對 HTTPS／SW／離線，再完成 iPhone 安裝驗收。
