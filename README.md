赫滋與羊融合藝術與科技，透過插畫與程式開發，打造獨特且富含故事性的品牌體驗。  HerzBaa blends art and technology, creating distinctive, story-driven brand experiences through illustration and full-stack development.

# HerzBaa

鍾雅婷／赫滋與羊的個人作品集網站，正式網址：https://herzbaa.com/ 。純靜態 HTML／CSS／JS，不需要建置步驟，直接部署整個資料夾即可（例如 GitHub Pages）。

## 結構

```
index.html                 單頁網站（所有內容都在這裡）
assets/css/main.css        設計系統（色彩、字級、間距 tokens）與所有樣式
assets/js/main.js          互動：數羊載入、平滑捲動、逐字進場、瀑布流作品集、燈箱、游標
assets/vendor/lenis/       平滑捲動（Lenis 1.1.20，MIT）
assets/img/                原始圖檔
assets/img/opt/            網站實際使用的最佳化 WebP 圖（由腳本產生）
tools/optimize-images.py   產生 assets/img/opt/ 的腳本
```

## 新增或替換作品

1. 把原圖放進 `assets/img/portfolio/`。
2. 執行 `python3 tools/optimize-images.py`（需要 Pillow），會輸出 640／1280／1920 寬的 WebP。
3. 在 `index.html` 的 `#works` 區塊複製一個 `<li class="work">`，修改 `data-cat`（`art`、`exhibit`、`web`、`software`）、圖片路徑、`width`/`height`、`alt`、標題與 `.work__story` 的故事文字。
4. 更新篩選按鈕上的數量。

## 本機預覽

```
npx http-server -p 8080
```

## 品質檢查重點

- 進場與捲動動畫會尊重系統「減少動態效果」設定；關閉 JavaScript 時內容仍完整可讀。
- 圖片全部為 WebP 並附 `srcset`／`width`／`height`，網站實際載入的圖檔由原本的 40MB 以上降到全部約 1.5MB 以內（首屏圖片約 0.1MB），其餘延遲載入。
- 以 axe-core 檢查 WCAG 2.1 AA：0 個違規。
