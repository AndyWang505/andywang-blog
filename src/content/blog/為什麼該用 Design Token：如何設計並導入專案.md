---
title: '為什麼該用 Design Token：如何設計並導入專案'
description: 'Material Design、GitHub Primer、shadcn/ui 都用同一套方法管理樣式 design token。剛好最近翻新部落格也用了相同思路來重新設計，因此本篇來說明它解決什麼問題、為什麼值得導入，以及想自己做一套 design system 或在專案裡使用時，該怎麼設計。'
pubDate: 'November 20 2026'
heroImage: ''
tags: ['CSS', 'Tailwind', 'Design-System']
category: '程式開發'
---

## 前言

由於最近在大翻修我的部落格，我發佈這篇文章時應該已經變成 2.0 版本，這次改版也將過去元件中寫死的樣式全改用 design token 管理，再次讚嘆 AI 的強大，又幫我省下許多時間。

改完後元件裡已經幾乎看不到任何色碼，dark mode 也不用在每個元件寫 dark，想換一套配色只要改一個檔案。

這篇就來整理這套做法的思路，然後也對照 Material Design、shadcn/ui 這些常用的 design system 跟 UI library 的做法。

## 沒有 token 時會遇到的問題

假設網站有一個「次要文字」的灰色，最直覺的寫法大概是這樣：

```html
<span class="text-[#6e6e73] dark:text-[#828bb8]">2026-11-20</span>
```

專案小的時候很快很方便，但專案一大就會出事：

1. 同一個用途散落在幾十個地方。設計說次要文字要再淡一點，只能全域搜尋 `#6e6e73`，還要祈禱沒人寫成 `#6E6E73` 或 `rgb(110,110,115)`。
2. 色碼不帶意義。看到 `#86868b` 不知道它是日期、裝飾編號還是 disabled 狀態，所以沒人敢改。
3. 主題是乘法。每個元件寫一份 light 一份 dark；要加高對比主題，就是每個元件再改一遍。
4. 設計和工程講不同語言。設計稿寫「Text/Secondary」，程式碼寫 `#6e6e73`，兩邊對不起來，每次改版都要人工比對。

## 為什麼建議用 token

Design token 這個詞來自 Salesforce 的 Lightning Design System，定義很簡單：

> 把設計上的決定（顏色、字級、間距、圓角、陰影、動畫時間）抽成有名字的變數，元件只引用名字，不碰實際的值。

聽起來只是「把色碼放進變數」，但它帶來的改變是結構性的：

1. 單一來源。每個設計決定只存在一個地方。改一次，全站同步，不會漏。
2. 名字就是文件。`color-fg-muted` 一看就知道是次要文字。新人不用猜，舊人也敢改。
3. 主題變成加法。元件只認用途名字，主題只是「用途 → 值」的另一份對應表。加一個主題等於多寫一份對應，元件一行都不用動。
4. 設計與工程共用詞彙。Figma Variables 和程式碼用同一組名字，設計改了 token，工程知道要改哪裡；W3C 底下的 Design Tokens Community Group 也在制定共用的 JSON 格式，讓工具之間能直接交換。
5. 限制選項，品質反而穩定。間距只有 4、8、12、16……可以選，就不會出現 13px、15px 這種「差不多」的值，畫面自然一致。

反過來說，什麼時候不需要？

一次性的活動頁、活不過一個月的 prototype，直接寫值就好了。

## 主流 Design System 怎麼做

幾乎所有成熟的 design system 都把 token 分成三層，只是命名不同：

| Design system     | 原始值                                  | 用途（主題在這層切換）               | 元件                                                 |
| ----------------- | --------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| Material Design 3 | reference<br>`md.ref.palette.primary40` | system<br>`md.sys.color.on-surface`  | component<br>`md.comp.filled-button.container.color` |
| Adobe Spectrum    | global                                  | alias                                | component-specific                                   |
| GitHub Primer     | base                                    | functional<br>`fgColor-muted`        | component                                            |
| Chakra UI         | `tokens`                                | `semanticTokens`                     | recipe                                               |
| shadcn/ui         | （直接寫色值）                          | `--background`、`--muted-foreground` | —                                                    |

幾個值得注意的地方：

1. Material 3 的動態配色（從桌布取色產生主題）做得到，是因為元件只認 system token，底下整組 reference palette 換掉也不影響元件。
2. GitHub Primer 同時支援多種 light、dark 和色盲友善主題，靠的就是只換 functional 那層。
3. shadcn/ui 少了原始值那層，色值直接寫在用途變數裡。專案小時很省事，但「元件只用用途名字、主題只換值」這個核心是一樣的，所以它的主題產生器換一組變數就能換掉整站配色。
4. Radix Colors 每個色系 12 階，每階都規定用途（前幾階是背景、最後兩階是文字），等於把用途層寫進色票規範。

三層解決的是同一個問題：把「值是多少」跟「拿來做什麼」分開。

## 設計一套 token：分成五個步驟

不管是要做一套給團隊用的 design system，還是自己專案的樣式基礎，順序都差不多。

### 1. 盤點原始值，建 primitive 層

先把專案裡出現過的顏色、字級、間距全部列出來，合併「差不多」的值，整理成一份色票和尺度：

```css
:root {
  --palette-gray-50: #f5f5f7;
  --palette-gray-600: #6e6e73;
  --palette-gray-900: #1d1d1f;
  --palette-blue-600: #0066cc;
}
```

名字只描述它是什麼（灰色第 600 階），不描述用途。規則只有一條：元件永遠不能直接用這層。

### 2. 定義用途，建 semantic 層

這是整套系統最重要、也最難的一步。問自己：「畫面上有哪些角色？」主要文字、次要文字、頁面底色、卡片底色、分隔線、強調色、錯誤狀態……每個角色一個 token：

```css
:root {
  --color-fg-default: var(--palette-gray-900); /* 標題、主要文字 */
  --color-fg-muted: var(--palette-gray-600); /* 日期、說明、標籤 */
  --color-bg-muted: var(--palette-gray-50); /* chip、搜尋框、hover */
  --color-accent: var(--palette-blue-600);
}
```

命名建議用固定的結構，讓名字可以被猜出來：

| `color` |  `fg`  | `muted` |   `hover`    |
| :-----: | :----: | :-----: | :----------: |
|  類別   | 用在哪 |  變化   | 狀態（選用） |

組起來就是 `--color-fg-muted-hover`。

除了顏色，字級、行高、間距、圓角、z-index、動畫時間也放這層。字級可以直接放 fluid 值：

```css
--text-base: clamp(1rem, 0.9775rem + 0.0922vw, 1.0625rem); /* 16 → 17px */
--space-4: 1rem;
--radius-md: 8px;
--duration-fast: 0.15s;
```

### 3. 主題只重新指派 semantic 層

```css
html.dark {
  --color-fg-default: var(--palette-tokyo-fg);
  --color-fg-muted: var(--palette-tokyo-fg-muted);
  --color-bg-muted: var(--palette-tokyo-bg-surface);
  --color-accent: var(--palette-tokyo-blue);
}
```

元件完全不知道現在是哪個主題。實際玩一下：下面這塊的元件只用 semantic token，切換時元件的 CSS 沒有任何改變，只有對應到的值換了。「高對比」是最後才加的主題，只多寫了一個 selector。

<iframe height="300" style="width: 100%;" scrolling="no" title="design system demo" src="https://codepen.io/editor/zuqpbbgu-the-encoder/embed/01a1f7cc-1dfd-7f67-955e-2c0b3a4afbef?default-tab=html%2Cresult&theme-id=-2" frameborder="no" loading="lazy" allowtransparency="true">
  See the Pen <a href="https://codepen.io/editor/zuqpbbgu-the-encoder/pen/01a1f7cc-1dfd-7f67-955e-2c0b3a4afbef">
  design system demo</a> by weiwei (<a href="https://codepen.io/zuqpbbgu-the-encoder">@zuqpbbgu-the-encoder</a>)
  on <a href="https://codepen.io">CodePen</a>.
</iframe>

### 4. 只在需要時加 component 層

component token 是「某個元件專屬、而且希望能單獨調整」的值，例如 header 高度、側欄寬度、按鈕圓角：

```css
:root {
  --header-height: 56px;
  --content-measure: 720px;
  --button-radius: var(--radius-md); /* 預設跟著全域，但可以單獨覆寫 */
}
```

不要一開始就幫每個元件的每個屬性建 token，那會讓 token 數量爆炸、沒人記得住。判斷標準：有沒有人會想只改這個元件、不改全域？有才建。

### 5. 用測試或 lint 把規則固定下來

規則只寫在文件裡，三個月後一定會有人為了趕時間偷寫色碼。建議至少自動檢查：

1. 元件引用的每個 token 都真的有定義。
2. light 有的每個 `--color-*`，dark 也一定要有（新增顏色忘了補 dark，CI 直接紅）。
3. primitive token 不能出現在 token 檔以外。
4. 元件裡不能出現寫死的 hex 色碼。

這幾條用 Vitest 讀 CSS 檔、跑 regex 就能做，不用額外工具；或用 Stylelint 的 `declaration-strict-value` 這類規則。

## 在自己的專案導入

### 情境一：用現成的 UI library

大部分人其實不用自己設計整套 token。用 shadcn/ui、Material、Chakra 時，換品牌色就是覆寫它的 semantic token，不要去改元件原始碼：

```css
/* shadcn/ui：只改變數，所有元件跟著換 */
:root {
  --primary: oklch(0.55 0.2 260);
  --radius: 0.5rem;
}
```

需要 library 沒有的顏色（例如品牌的第二強調色）時，照它的命名方式新增一個 token，而不是在元件裡寫死。

### 情境二：既有專案，想逐步改成 token

1. 先做顏色的 semantic 層，大概 10 到 15 個就夠：fg（3–4 階）、bg（2–3 階）、border（2 階）、accent、成功／警告／錯誤。顏色是最常改、最常出錯的。
2. 接上 Tailwind。在 theme 裡讓 class 指向變數，元件就能寫 `text-fg-muted` 而不是 `text-[#6e6e73]`（範例在下一節）。
3. 新元件先用，舊元件碰到再換。不需要一次全部重寫；搭配上面的 hex 檢查測試，先只對新目錄開啟，範圍慢慢擴大。
4. 穩定後再補間距、字級、圓角，最後才考慮 component 層。

### 值放 CSS 變數，不要只放 Tailwind config

用 Tailwind 的專案常見的疑問：直接把色碼寫進 `tailwind.config` 不是更簡單？差別在 CSS 變數是 runtime，Tailwind config 是 build time：

1. 主題靠一個 class（`html.dark`）就能切換，不用每個元件產生兩份 class。
2. 非 Tailwind 的 CSS（文章 prose、第三方元件覆寫）也能讀同一份值。
3. 可以放 `clamp()` 這類 fluid 值。
4. Tailwind v4 改用 CSS 裡的 `@theme` 定義 token，本來就是 CSS 變數；semantic 層照 `--color-*`、`--text-*` 命名，升級時幾乎不用改。

## 案例：部落格 2.0

我的部落格在 2.0 照上面的步驟改成三層 token，結構如下：

  <div class="not-prose my-8">
  <div class="grid gap-3 lg:grid-cols-3">
  <div class="grid content-start gap-1.5 rounded-lg border border-line p-4" style="border-top: 3px solid var(--color-series-5)">
  <span class="justify-self-start rounded-full border px-2 font-mono text-xs" style="color: var(--color-series-5)">Layer 1</span>
  <span class="text-base font-bold text-fg">Primitive</span>
  <span class="font-mono text-xs text-fg-muted">primitives.css</span>
  <span class="text-sm leading-relaxed text-fg-body">原始色值。名字描述「它是什麼顏色」，只給 semantic 層讀。</span>
  <span class="break-all rounded-md bg-bg-muted px-2 py-1.5 font-mono text-xs text-fg">--palette-gray-600: #6e6e73</span>
  </div>
  <div class="grid content-start gap-1.5 rounded-lg border border-line p-4" style="border-top: 3px solid var(--color-series-1)">
  <span class="justify-self-start rounded-full border px-2 font-mono text-xs" style="color: var(--color-series-1)">Layer 2</span>
  <span class="text-base font-bold text-fg">Semantic</span>
  <span class="font-mono text-xs text-fg-muted">semantic.css</span>
  <span class="text-sm leading-relaxed text-fg-body">用途命名。切換主題時只換這一層的對應。</span>
  <span class="break-all rounded-md bg-bg-muted px-2 py-1.5 font-mono text-xs text-fg">--color-fg-muted: var(--palette-gray-600)</span>
  </div>
  <div class="grid content-start gap-1.5 rounded-lg border border-line p-4" style="border-top: 3px solid var(--color-series-3)">
  <span class="justify-self-start rounded-full border px-2 font-mono text-xs" style="color: var(--color-series-3)">Layer 3</span>
  <span class="text-base font-bold text-fg">Component</span>
  <span class="font-mono text-xs text-fg-muted">components.css</span>
  <span class="text-sm leading-relaxed text-fg-body">屬於某個版面或元件的尺寸。</span>
  <span class="break-all rounded-md bg-bg-muted px-2 py-1.5 font-mono text-xs text-fg">--content-measure: 720px</span>
  </div>
  </div>
  <div class="mt-3 text-center font-mono text-xs text-fg-muted">semantic + component → tailwind-theme.mjs → Tailwind class → 元件</div>
  </div>

Tailwind 那層只做對應，拿到的永遠是 var(--...)：

```js
const v = (name) => `var(--${name})`;

export const tokenTheme = {
  colors: {
    fg: { DEFAULT: v('color-fg-default'), muted: v('color-fg-muted') },
    bg: { DEFAULT: v('color-bg-default'), muted: v('color-bg-muted') },
  },
  height: { chip: v('chip-height') },
};
```

於是元件裡沒有色碼、沒有 `dark:`、也沒有魔術數字：

```html
<a class="min-h-chip rounded-full bg-bg-muted text-fg">
  <span class="text-fg-muted">12</span>
</a>
```

v2 的元件目錄裡 `dark:` 出現 0 次；第五步提到的四條規則都寫成了 Vitest 測試，跟著 `pnpm test` 一起跑。

## 常見的坑

1. 用外觀命名。`--color-light-gray` 在 dark 主題會變成謊言。名字永遠描述用途。
2. token 太多。每個元件每個屬性都建 token，最後沒人記得哪個是哪個。semantic 層夠用時，不要加 component token。
3. primitive 外洩。元件直接用 `--palette-*`，換主題時這些地方不會跟著變。用測試擋。
4. Arbitrary value 繞過 token。Tailwind 的 h-[34px] 很方便，但同一個值出現第二次時，就該考慮收成 token。
5. 斷點沒辦法用 CSS 變數。media query 讀不到 `var()`，斷點只能另外管理：用測試檢查一致，或用 PostCSS 的 `@custom-media`。

## 結語

Design token 說穿了就是一件事：把「值是多少」和「拿來做什麼」分開。

Primitive 管值，semantic 管用途，component 管元件專屬的例外；元件只跟用途說話，主題只換對應表。這是 Material、Primer、shadcn/ui 都走的路，也是為什麼它們能支援多主題、讓使用者換品牌色而不碰元件。

要自己做 design system，從 semantic 層的命名開始想；要在專案導入，從 10 幾個顏色 token 開始做。先讓顏色有名字，其他的會慢慢跟上。
