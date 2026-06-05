# Nginx Configuration for Exchange Project

本文檔記錄了將 `exchange-frontend` 通過 Nginx 暴露到外部網路的設置步驟。

## 1. 配置文件路徑
- **主要配置檔**: `/etc/nginx/sites-available/exchange`
- **啟用連結**: `/etc/nginx/sites-enabled/exchange` (已連結到上述檔案)

## 2. Nginx 配置內容
配置內容模擬了 `vite.config.ts` 的代理邏輯，並直接服務編譯後的靜態檔案：

```nginx
server {
    listen 80;
    server_name _;

    # 前端編譯後的靜態檔案路徑
    root /home/harvey_euph/exchange/exchange-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 代理 Management WebSocket (Port 9001)
    location /ws-mgmt {
        proxy_pass http://127.0.0.1:9001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 代理 L2 Market Data WebSocket (Port 9002)
    location /ws-l2 {
        proxy_pass http://127.0.0.1:9002/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 代理 API 請求 (Port 8080)
    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 3. 執行的操作
1.  **檢查安裝**: 確認 Nginx 已安裝。
2.  **更新配置**: 使用 `sudo` 更新 `/etc/nginx/sites-available/exchange`。
3.  **驗證與重載**: 
    - 執行 `sudo nginx -t` 檢查語法。
    - 執行 `sudo systemctl reload nginx` 套用變更。
4.  **確認路徑**: 確認 `/home/harvey_euph/exchange/exchange-frontend/dist` 目錄存在且包含 `index.html`。

## 4. 後續維護建議
- **更新代碼**: 若修改前端代碼，需執行 `npm run build` 更新 `dist` 目錄。
- **防火牆**: 確保 GCP 控制台已開放 **TCP 80** 端口。
- **日誌查看**: 
    - 訪問日誌: `/var/log/nginx/access.log`
    - 錯誤日誌: `/var/log/nginx/error.log`
