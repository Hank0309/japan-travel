# GitHub 與正式部署

目前僅本機成果，**沒有公開網址**。未獲授權前不建立雲端資源、不 Push、不部署。沒有設定任何假 project ID、遠端 URL 或 secret。首選 Firebase Hosting。

## 授權時需要提供

1. GitHub repository URL，或允許建立的帳號／名稱／公開或私人設定。
2. Firebase Project ID；若尚無，需同意建立專案及選擇帳戶。免費 Hosting 用量仍以服務當時條款為準，不啟用付費升級。
3. 允許將此一般行程公開到 HTTPS 網站，或指定其他存取限制。旅遊日期、一般航班與飯店名稱將可由前端讀取；私人訂位資料不包含在 build。

## GitHub

登入 GitHub CLI 或透過使用者 Git 認證。確認 `.gitignore` 已排除 `private/`、node_modules、測試 profile、個人 seed 與環境變數，再加入經授權遠端並 Push。公開前檢查 staged 檔案；不得提交原始 PDF、OCR、私人備份或真實代碼。

CI 工作流會跑 Lint、Type Check、Vitest、Build、四組 Playwright 及更新測試。手動 Production workflow 先呼叫同一 commit 的完整 CI，全部通過才上傳 verified-production-SHA artifact。部署 job 依賴驗證成功並下載該產物，不重新建置。

GitHub 遠端必須設定 production environment 的 required reviewers 與允許部署分支；YAML 本身不會啟用人工審核。遠端設定、權限及 runner 執行仍待授權後驗證。

## Firebase Hosting

授權後安裝／使用 Firebase CLI，先以人類帳戶完成登入。現有 `firebase.json` 提供 dist、SPA rewrite、CSP、安全標頭及快取規則。

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
firebase login
firebase deploy --only hosting --project YOUR_CONFIRMED_PROJECT_ID
```

`YOUR_CONFIRMED_PROJECT_ID` 為說明用占位符，並非已建立專案。

GitHub 自動部署需 Repository variable `FIREBASE_PROJECT_ID`、Secret `FIREBASE_SERVICE_ACCOUNT` 與 `production` environment 審核者。Service Account 由專案管理員採最小權限建立，私鑰只放 GitHub Secrets，不交給前端、不寫入 repo。若不使用 Actions 部署，可只使用互動式 Firebase CLI，不必建立服務帳戶金鑰。

## 部署後必做

- HTTPS 回應、五頁深連結與 HTTP 安全標頭。
- manifest 名稱、start_url、圖示 MIME／尺寸與 iOS icon。
- Service Worker scope／控制狀態及第一次資源預快取。
- 關網後重新載入行程與新增記帳；重新開 App 確認資料仍在。
- 發布下一版，按更新後帳本仍保留。
- iPhone Safari 真機加入主畫面、獨立模式、安全區域與鍵盤表單操作。

localhost 的安裝與離線測試不能代替上述正式 HTTPS 網站驗證。若 Firebase 不可用，才在另行同意後評估 Cloudflare Pages 或 Sevalla，沿用同一 dist，不重建產品。
