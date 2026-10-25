# GitHub Pages 正式部署驗收

日期：2026-10-25。使用者明確同意將 `Hank0309/japan-travel` 改為 Public，公開原始碼、旅行日期、一般航班、飯店與行程，並部署 GitHub Pages。

- 正式網址：https://hank0309.github.io/japan-travel/
- 原始碼：https://github.com/Hank0309/japan-travel
- 發布版本：`ae1caea`。
- 遠端完整驗證與發布：https://github.com/Hank0309/japan-travel/actions/runs/40207772244 （success）。
- 未建立 Firebase 或 Cloudflare 資源，未升級付費方案。

## 已實際驗證

- 本機 Lint、Type Check、23 個單元測試、正式 Build 通過。
- 子路徑版本在四組瀏覽環境的 48 個自動化測試通過。
- 本機模擬新版 Service Worker 更新並離線重載，帳本保留。
- GitHub runner 完整 CI 與 publish 均成功；發布使用同一 commit 的已驗證 artifact。
- 正式 HTTPS 網站在 Chromium 與 WebKit、390 × 844 尺寸回應 200，沒有未捕捉的頁面例外。
- 正式 Manifest、192/512 圖示與 iOS 圖示可讀；start_url 與 scope 均為 `/japan-travel/`。
- 正式網站 Service Worker 控制範圍正確。
- 正式網站斷網新增消費，重載後仍保留；離線行程與兩間住宿資訊可讀。
- 上傳檔案不包含 `private/`、PDF、OCR、帳本或私人訂位；公開檔案與 dist 的舊成本指紋掃描沒有命中。

## 使用與更新

Safari 開啟正式網址 → 分享 → 加入主畫面。首次保持連線讓離線資源下載完成，再以飛航模式測試。每位使用者的帳本、備註與私人訂位獨立儲存在自己的瀏覽器，沒有多人同步。

更新程式後 Push 至 main，先檢查 Quality checks；至 Actions → Deploy GitHub Pages → Run workflow，全部檢查通過才發布。手機出現更新提示時可按「更新 App」。

## 尚待人工驗證與限制

iPhone 真機主畫面安裝、鍵盤、安全區與關閉重開仍待實測；桌面 WebKit 不代表真機已驗收。正式站未進行第二次版本升級測試，該情境目前以本機測試涵蓋。

這是公開網站，無指定訪客白名單，網址被轉傳後任何人都能開啟。GitHub Pages 不套用 firebase.json 的自訂 HTTP 安全標頭。原始 PDF 的票券缺漏與時間矛盾仍需真實憑證核對。

離線資料與 JSON 備份由使用者保管；清除網站資料或換裝置會失去未備份內容。
