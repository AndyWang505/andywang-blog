---
title: 'Tmux with Claude Code - 2026/Nov'
description: '當 AI coding agent 讓「寫 code」變快之後，開發的瓶頸就轉移到「人」身上了。現在的日常不再是盯著程式碼逐行看，而是要同時管好幾個 Claude Code，我得知道誰在等我、誰做完了、誰改了什麼，還不能讓它們在同一個目錄裡互相打架。'
pubDate: 'November 13 2026'
heroImage: 'https://github.com/AndyWang505/dotfiles/raw/main/docs/assets/claude-code-in-tmux.gif'
tags: ['Tmux', 'Claude', 'Multi-Agent']
category: '開發工具'
---

## 前言

當 AI coding agent 讓「寫 code」變快之後，開發的瓶頸就轉移到「人」身上了。現在的日常不再是盯著程式碼逐行看，而是要同時管好幾個 Claude Code，我得知道誰在等我、誰做完了、誰改了什麼，還不能讓它們在同一個目錄裡互相打架。

這篇整理我在 2026 年 11 月用 tmux 重新打造的工作流。核心概念很簡單：一個 Claude 一個 tmux window、一張票一個 git worktree，透過 Claude Code 的 hooks 把即時狀態寫進 tmux，再用幾個順手的快捷鍵，把開工（Spawn）、等待與回應（Wait / Jump）、Review、收尾（Close）串成一個閉環。

先列一下我的基礎環境：macOS、Ghostty、fish、tmux 3.8、Neovim（LazyVim），設定檔用 GNU Stow 管理。

## 痛點釐清

### 階段一：在 VS Code / Cursor / Zed 的終端裡跑 Claude

多數人剛開始用 Claude Code，都是開著編輯器，在底下的整合終端機裡直接跑。只開一個的時候很順，一旦同時開到兩三個，就會有點卡手了

- 關掉就丟：終端機是依附在編輯器視窗上的。不小心關掉視窗、或者編輯器更新重開，跑到一半的 Claude 就跟著斷了。事後還得自己回憶對話內容，一個個用 `claude --resume` 撈回來。
- 一個視窗綁一個資料夾：想在不同 worktree 或不同 repo 同時開工，就得開好幾個編輯器視窗，每個視窗都吃一份完整的記憶體。要找某個 Claude，得先切對視窗、再找對分頁。
- 終端跟編輯器搶畫面：Claude 的輸出很長，塞在編輯器底下那幾行根本看不清楚；把終端拉大，又把正在看的 code 擋住了。
- 看不到別的視窗在幹嘛：在另一個視窗裡的 Claude 停下來問問題，除非切過去，否則它就一直在那裡空等。

把 Claude 搬出編輯器、放進 tmux 之後，第一個問題直接消失：tmux server 在背景常駐，關掉終端視窗只是 detach，Claude 照樣在背景跑。編輯器也終於能回到它最擅長的位置，單純用來讀 code 和改 code。

### 階段二：搬到純終端之後的新問題

一開始只是在 tmux 裡多開幾個 window 跑 Claude。平行的數量一超過兩個，時間就不是花在寫 code，而是花在「找」與「等」。

1. 看不到誰在等我
   - Claude 停在權限確認或問題上，我要切過去才知道，中間那段時間它都在白等。
   - 做完的結果沒人看，下一步就卡住。
   - window 名稱全部是 claude，分不出哪個在做哪張票。
   - 主對話結束了，但背景 subagent 還在跑，看起來「做完」其實沒有。
2. 工作目錄互相干擾
   - 幾個 Claude 在同一個 repo 改不同票，改動混在同一個 working tree。
   - 改用 git worktree 後，新開的 Claude 還是預設開在主 repo；而跑起來的 session 不能搬家（/diff 也只看啟動目錄）。
   - worktree 活得比 PR 還久，越積越多，又怕刪到還沒 push 的東西或手動複製的 .env。
3. 離開編輯器後 review 變難
   - 在 IDE 裡有 diff 面板，搬到終端後要看 Claude 改了什麼，得自己開 nvim 跑 diffview。
   - 只看 uncommitted 會漏掉 Claude 自己 commit 的部分。
   - Claude 在另一個 worktree 改 code（例如 autofix），從原本的 window 完全看不到。
4. 重開機還是會丟
   - tmux 擋得住關視窗，擋不住重開機或 tmux server 掛掉：每個對話在哪個目錄、哪個 session 全部要重建。
   - tmux-resurrect 只還原 layout，不會把 Claude 對話帶回來。

## 解法總覽

核心只有一個想法：讓 Claude Code 自己把狀態寫進 tmux，其他功能都只是讀這個狀態。

<div class="not-prose my-8 grid gap-3">
  <span class="text-sm font-semibold text-fg-muted">Claude 的每個事件都變成 tmux 看得到的狀態</span>
  <div class="flex flex-col items-stretch gap-2 sm:flex-row">
    <div class="grid flex-1 content-center gap-1 rounded-lg border border-line p-3 text-center">
      <span class="text-base font-bold text-fg">Claude Code</span>
      <span class="text-sm text-fg-muted">送出 prompt、用 tool、問問題、做完、失敗</span>
    </div>
    <span class="self-center text-fg-subtle"><span class="sm:hidden">↓</span><span class="hidden sm:inline">→</span></span>
    <div class="grid flex-1 content-center gap-1 rounded-lg border border-line p-3 text-center">
      <span class="text-base font-bold text-fg">hooks</span>
      <span class="text-sm text-fg-muted">每個事件觸發一次，寫進 tmux 的 window 變數</span>
    </div>
    <span class="self-center text-fg-subtle"><span class="sm:hidden">↓</span><span class="hidden sm:inline">→</span></span>
    <div class="grid flex-1 content-center gap-1 rounded-lg border-2 border-accent bg-bg-subtle p-3 text-center">
      <span class="text-base font-bold text-fg">window 狀態</span>
      <span class="font-mono text-sm text-fg">working · ask</span>
      <span class="font-mono text-sm text-fg">done · idle</span>
      <span class="text-xs text-accent">唯一的狀態來源</span>
    </div>
  </div>
  <span class="text-center text-sm text-fg-muted">↓ 三個地方讀同一份狀態 ↓</span>
  <div class="grid gap-2 sm:grid-cols-3">
    <div class="grid content-start gap-1 rounded-lg border border-line p-3 text-center">
      <span class="text-base font-bold text-fg">狀態列</span>
      <span class="text-sm text-fg-muted">每個 window 一個圖示：轉圈、問號、打勾、月亮</span>
    </div>
    <div class="grid content-start gap-1 rounded-lg border border-line p-3 text-center">
      <span class="text-base font-bold text-fg">cmd+p / cmd+i</span>
      <span class="text-sm text-fg-muted">在等我的 window 排最前面，一鍵跳過去</span>
    </div>
    <div class="grid content-start gap-1 rounded-lg border border-line p-3 text-center">
      <span class="text-base font-bold text-fg">桌面通知</span>
      <span class="text-sm text-fg-muted">window 不在眼前才通知</span>
    </div>
  </div>
</div>

Claude Code 提供了完整的 lifecycle hooks，在送出 prompt、呼叫 tool、跳出問題、甚至一輪對話結束時都會觸發。

利用這些時機點，把「這個 window 現在在幹嘛」寫進 tmux 的自訂變數裡。底下的狀態列、視窗切換器（picker）、桌面通知全都讀同一份狀態，資訊永遠同步，不會各說各話。

每個 window 的狀態會這樣變化：

| 從 | 到 | 什麼時候 |
| --- | --- | --- |
| idle | working | 送出 prompt |
| working | ask | 跳出問題或權限確認 |
| ask | working | 回答之後繼續跑 |
| working | done | 這一輪結束，而且背景 subagent 都結束了；主對話先結束但 subagent 還在跑時，會維持 working，不會誤發完成通知 |
| done | idle | 切到這個 window 看過結果 |

當初選擇用 hooks 而不是去爬終端機畫面（pane scraping）判斷狀態，是因為畫面很難分辨細節

像是背景還有 subagent 在跑、subagent 自己跳出問題、或是遇到 API error。

用 hooks 就能精準抓到這些狀態，唯一的代價是這套機制強綁定 Claude Code，沒辦法直接套用在其他 CLI agent 上。

## 多任務平行處理

這套工作流的目標是「把任務丟出去就不用盯」：Claude 需要我介入時會主動浮出來，我只要專心處理排在最前面的那一個。

為了不打斷操作節奏，我在 Ghostty 與 tmux 裡綁了四組自訂快捷鍵，把日常操作串成 Spawn → Wait → Jump → Close 的循環：

| 自訂快捷鍵  | 對應動作           | 用途                                                                   |
| ----------- | ------------------ | ---------------------------------------------------------------------- |
| cmd+shift+n | Spawn（開工）      | 叫出目錄與 worktree 選單，快速啟動新的 Claude window                   |
| cmd+i       | Jump（一鍵跳轉）   | 跨 session 跳到下一個正在等我的 window（問題優先於完成）               |
| cmd+p       | Picker（全局總覽） | 打開狀態列表與即時預覽，查看各視窗與 subagent 進度（內建 ctrl-x 關閉） |
| cmd+r       | Review（差異檢視） | 跳出浮動視窗開啟 Neovim diffview，檢視整個 branch 的改動               |

實際運作起來的流程長這樣：

1. Spawn（開工）：按下 cmd+shift+n 叫出目錄選單，裡面會列出目前目錄、這個 repo 底下的所有 worktree，以及 Claude 最近跑過的目錄（按時間新到舊排），worktree 旁邊還會直接顯示對應的 PR 狀態。按 Enter 開新對話、ctrl-o 接續該目錄上次的對話、ctrl-n 則是在全新的 tmux session 裡啟動。
2. Wait（等待）：狀態列上的每個 window 都有專屬圖示：轉圈代表正在跑、問號代表等我回答、打勾代表做完還沒看、月亮則是 idle。遇到「問題」或「完成」時都會觸發 Ghostty 桌面通知（完成通知還會貼心附上 Claude 回覆的第一行）。為了避免干擾，如果該 window 已經在眼前，就不會跳問題通知；同一個 session 在眼前，也不會跳完成通知。若遇到 API error 失敗則會發 ⚠️ 通知。
3. Jump（跳轉）：按下 cmd+i 直接跳到下一個在等我的 window，支援跨 session 跳轉，而且「等回答」的優先級高於「已完成」。如果想先看全局狀況就按 cmd+p 叫出 picker：正在等我的視窗會排在最前面，右側預覽窗格會直接顯示終端畫面、git branch，以及底下每個 subagent 正在做什麼、最後呼叫的 tool 和執行時間。
4. Close（收尾）：切過去看過結果後，完成標記會自動轉成 idle。確認不用的 window，直接在 cmd+p 選單裡按 ctrl-x 關掉。

此外，狀態列右側隨時顯示「其他 session」裡還有幾個問題、幾個完成。就算我正待在某個 session 裡專心看 code，也不會漏掉別處正在等我的任務。

## 大規模專案

做大型 feature 時，常遇到的瓶頸不是 Claude 寫不出來，而是改動範圍跨度太大 API、Services、共用套件、商業邏輯行為，單一對話的 context 根本裝不下。我的做法是把任務拆開，讓每一塊都有自己獨立的目錄和 session。

### 一張票一個 worktree，一個 worktree 一個 window

- 每個 Claude 從啟動那一刻起，就待在它專屬的 worktree 裡，改動完全隔離，跑 /diff 或開 review popup 也能直接對應到正確的目錄。
- 堅持一個 window 只跑一個 Claude，狀態直接綁在 window 上，整個心智模型與狀態追蹤都非常單純。

### 拆 session：Lead Claude 與分工的 Claude

遇到大功能時，我會開一個新的 tmux session，裡面放一隻 Lead Claude 負責讀 spec、把任務拆成 API、Web 等模組，再把每一塊分派給各自獨立的 session 與 worktree。因為每個 session 的狀態都會彙整到全域狀態列，我隨時可以用 `cmd+i` 跨 session 跳轉處理。

### 讓背景的 Subagent 變透明

在大型任務裡，主對話派發 subagent 平行處理已經是常態，但以前 subagent 就像黑盒子，完全不知道它們跑到哪了。現在透過 hooks 追蹤：

- 主對話結束、但背景還有 subagent 在跑時，window 會維持「轉圈（執行中）」，不會誤發完成通知；直到最後一個 subagent 回報、整輪任務真正結束才算完成。
- subagent 拋出的權限或確認問題會被獨立記錄，不會因為主對話先結束就被蓋掉。
- 在 cmd+p 的預覽畫面裡，會清楚列出每個 subagent 的任務摘要、最後執行的 tool 和已耗費時間（超過 15 分鐘沒動靜的會自動視為殘留並隱藏）。

### 跨 worktree 的 Code Review

按下 `cmd+r` 會直接用浮動視窗開啟 Neovim + diffview，預設比對整個 branch diff（從分支切出來後的所有改動，包含已 commit 和未 commit 的部分）。比對基準（base）會自動抓該 PR 的 target branch，如果還沒開 PR 就抓最新的 `release/*` 或預設分支。另外，透過 `PostToolUse hook` 記下這個 Claude 編輯過的所有目錄，就算它跨去別的 worktree 改了東西，按 `cmd+r` 一樣抓得出來。

### 斷線與重開機自動接回

Hooks 會在背景維護一份目前 tmux server 執行中的對話清單。就算電腦重開機，只要重新啟動第一個 tmux，腳本就會自動在原本的 session、原本的目錄裡用 `claude --resume` 把所有未結束的對話撈回來（如果是正常用 `/exit`、`/clear` 或手動關掉的 window 則不會復原）。

若是跨天的大型工作，再搭配自訂的 `/catchup save` 把商業邏輯與接續點存成 `catchup.md`，隔天開新 session 讀檔就能無縫接手。

## 閉環開發

所謂「閉環」，核心在於自動回饋與驗證：每次產出都必須經過檢查，沒過就自動打回去修，修到通過才往下走。這並不等於完全不需要人工，而是把人的精力留在最關鍵的決策點上。

在這套流程裡，人只需要把守頭尾兩個關卡：開工前確認需求與規劃，收尾前 Review 並合併 PR。中間的實作、驗收、Code Review、修正全部讓 Claude 自己轉，只有當它遇到歧義或卡關來問問題時，tmux 才會把人叫過來。

<div class="not-prose my-8 grid gap-2">
  <span class="text-sm font-semibold text-fg-muted">一張票走一圈：不過就送回去修，人只在需要時被叫來</span>
  <div class="mb-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
    <span class="rounded-full border px-2 py-0.5 font-semibold" style="color: var(--color-accent); border-color: currentColor">人</span>
    <span class="rounded-full border px-2 py-0.5 font-semibold" style="color: var(--color-series-2); border-color: currentColor">Claude</span>
    <span class="rounded-full border px-2 py-0.5 font-semibold" style="color: var(--color-series-3); border-color: currentColor">tmux</span>
    <span>藍框是人要介入的地方</span>
  </div>
  <div class="grid gap-2 rounded-lg border border-line p-3">
    <span class="text-sm font-bold text-fg">① 開工前：人確認方向</span>
    <div class="flex flex-col items-stretch gap-2 sm:flex-row">
      <div class="grid flex-1 content-start gap-0.5 rounded-md border border-line px-3 py-2">
        <span class="text-xs font-semibold" style="color: var(--color-accent)">人</span>
        <span class="text-sm font-bold text-fg">需求</span>
        <span class="text-xs text-fg-muted">Jira 票、PM spec、Figma</span>
      </div>
      <span class="self-center text-fg-subtle"><span class="sm:hidden">↓</span><span class="hidden sm:inline">→</span></span>
      <div class="grid flex-1 content-start gap-0.5 rounded-md border border-line px-3 py-2">
        <span class="text-xs font-semibold" style="color: var(--color-series-2)">Claude</span>
        <span class="text-sm font-bold text-fg">盤查與規劃</span>
        <span class="text-xs text-fg-muted">/recon、/plan、/tasks 拆票</span>
      </div>
      <span class="self-center text-fg-subtle"><span class="sm:hidden">↓</span><span class="hidden sm:inline">→</span></span>
      <div class="grid flex-1 content-start gap-0.5 rounded-md border-2 border-accent bg-bg-subtle px-3 py-2">
        <span class="text-xs font-semibold" style="color: var(--color-accent)">人</span>
        <span class="text-sm font-bold text-fg">確認規劃</span>
        <span class="text-xs text-fg-muted">需求和拆票都對了才動工</span>
      </div>
    </div>
  </div>
  <span class="text-center leading-none text-fg-subtle">↓</span>
  <div class="grid gap-2 rounded-lg border border-dashed border-line bg-bg-subtle p-3">
    <span class="text-sm font-bold text-fg">② 中間：Claude 自己跑，人不用盯</span>
    <div class="flex flex-col items-stretch gap-2 sm:flex-row">
      <div class="grid content-start gap-0.5 rounded-md border border-line bg-bg px-3 py-2 sm:w-40">
        <span class="text-xs font-semibold" style="color: var(--color-series-3)">tmux</span>
        <span class="text-sm font-bold text-fg">Spawn</span>
        <span class="text-xs text-fg-muted">cmd+shift+n 開 worktree 和 window</span>
      </div>
      <span class="self-center text-fg-subtle"><span class="sm:hidden">↓</span><span class="hidden sm:inline">→</span></span>
      <div class="grid flex-1 content-start gap-1.5 rounded-md border border-line bg-bg px-3 py-2">
        <span class="text-xs font-semibold" style="color: var(--color-series-2)">Claude</span>
        <span class="text-sm font-bold text-fg">實作迴圈（/impl、/autofix）</span>
        <div class="flex flex-wrap items-center gap-1.5 text-xs text-fg">
          <span class="rounded bg-bg-muted px-1.5 py-0.5">實作</span><span class="text-fg-subtle">→</span>
          <span class="rounded bg-bg-muted px-1.5 py-0.5">驗收 typecheck / lint</span><span class="text-fg-subtle">→</span>
          <span class="rounded bg-bg-muted px-1.5 py-0.5">審查 reviewer</span>
        </div>
        <span class="text-xs text-fg-muted">↻ 沒過就派 subagent 修，再驗一次，全過才往下</span>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
      <span class="font-semibold" style="color: var(--color-series-3)">tmux 盯狀態</span>
      <span>卡關或要問 → 變 ask，通知我</span>
      <span class="text-fg-subtle">·</span>
      <span>做完 → 變 done，通知我</span>
      <span class="text-fg-subtle">·</span>
      <span>cmd+i 跳過去</span>
    </div>
  </div>
  <div class="flex items-center justify-center gap-3 text-xs text-fg-muted">
    <span class="text-base leading-none text-fg-subtle">↓</span>
    <span class="rounded-md border border-dashed border-line px-2 py-0.5">Review 要改 → 回原 window 叫 Claude 改，回到 ②</span>
  </div>
  <div class="grid gap-2 rounded-lg border border-line p-3">
    <span class="text-sm font-bold text-fg">③ 收尾：人把關</span>
    <div class="flex flex-col items-stretch gap-2 sm:flex-row">
      <div class="grid flex-1 content-start gap-0.5 rounded-md border-2 border-accent bg-bg-subtle px-3 py-2">
        <span class="text-xs font-semibold" style="color: var(--color-accent)">人</span>
        <span class="text-sm font-bold text-fg">Review</span>
        <span class="text-xs text-fg-muted">cmd+r 開 diffview 看整個 branch</span>
      </div>
      <span class="self-center text-fg-subtle"><span class="sm:hidden">↓</span><span class="hidden sm:inline">→</span></span>
      <div class="grid flex-1 content-start gap-0.5 rounded-md border border-line px-3 py-2">
        <span class="text-xs font-semibold" style="color: var(--color-series-2)">Claude</span>
        <span class="text-sm font-bold text-fg">Draft PR</span>
        <span class="text-xs text-fg-muted">開 PR、寫描述</span>
      </div>
      <span class="self-center text-fg-subtle"><span class="sm:hidden">↓</span><span class="hidden sm:inline">→</span></span>
      <div class="grid flex-1 content-start gap-0.5 rounded-md border-2 border-accent bg-bg-subtle px-3 py-2">
        <span class="text-xs font-semibold" style="color: var(--color-accent)">人</span>
        <span class="text-sm font-bold text-fg">Merge</span>
        <span class="text-xs text-fg-muted">確認後合併</span>
      </div>
      <span class="self-center text-fg-subtle"><span class="sm:hidden">↓</span><span class="hidden sm:inline">→</span></span>
      <div class="grid flex-1 content-start gap-0.5 rounded-md border border-line px-3 py-2">
        <span class="text-xs font-semibold" style="color: var(--color-series-3)">tmux</span>
        <span class="text-sm font-bold text-fg">Close</span>
        <span class="text-xs text-fg-muted">ctrl-x 關 window、刪 worktree</span>
      </div>
    </div>
  </div>
  <span class="text-center text-xs text-fg-muted">↻ 下一張票，回到 ①</span>
</div>

藍框是我要介入的地方，其他步驟都交給 Claude Code skill 和 tmux。

1. 需求 → 盤查與規劃：/recon 唯讀盤查 codebase 與 BE API，/plan 產出 spec，/tasks 拆成 Jira 票。bug 單票就直接跳到實作。
2. Spawn → 實作：一張票一個 worktree 一個 window。/impl 依票派 subagent 實作；/autofix 從建 worktree、修、typecheck / lint、開 draft PR、自驗一路跑完，最後自己清掉 worktree，不必再手動 Close。
3. Wait / Jump：這段時間我在做別的票。Claude 問問題或做完時狀態列與通知會告訴我，cmd+i 跳過去。
4. Review → Draft PR：cmd+r 看 branch diff，要改就回到同一個 window 叫 Claude 改（圖中虛線），沒問題就開 PR、寫 PR 描述。
5.  Close：PR merge 後 ctrl-x 關 window，順便刪 worktree。只有沒人在用、沒有未 commit、commit 都在 branch 上、ignored 檔跟主 worktree 一樣的才會被提供；PR 已 merge 或 close、且 branch 還停在 PR 最後一個 commit 時，branch 一起刪。

做到一半要跨天或 /clear，先 /catchup save 存接續點，重開機後對話也會自動 resume，這一圈不會因為中斷而斷掉。

> 補充：工作流中的自訂 Claude Code Skills
>
> | Skill | 做什麼 |
> | -------- | -------- |
> | /recon | 動工前的通讀盤查：理解需求、找出相關程式碼與影響範圍、確認後端 API 規格，最後建議開發路徑（唯讀，不改 code）。 |
> | /plan | 技術規劃：將 PM 的需求規格轉化為前端實作藍圖，包含架構設計、異動檔案清單與 story 拆分。 |
> | /tasks | 任務拆解：把 /plan 的藍圖細分成可執行的 Jira story 與子任務，並估算 story point。 |
> | /impl | 多 Agent 協作實作：主 session 負責拆票派工給獨立 subagent 實作，並另派 subagent 審查，自己只做最終驗收（細節見下方）。 |
> | /autofix | Bug 單票一條龍：自動建 worktree → 修復 → 跑 typecheck / lint → 開 draft PR → 自驗 → 清理 worktree。 |
> | /catchup | 跨 Session 記憶存取：將當下的商業邏輯脈絡與進度斷點濃縮存成 catchup.md，方便下一個 session 接手。 |

### `/impl`：主 Session 只負責派工與驗收

這是整個開發流程裡「機器自己轉」的核心閉環。除非遇到嚴重卡關（BLOCKED、需求模糊或 subagent 連續失敗），中間完全不需要人介入。/impl 的主 session 自己不寫任何一行 code，而是扮演 Tech Lead 的角色，把工作拆開分派給擁有獨立 context 的 subagent：

1. 實作（Implement）：一個 task 派一隻 subagent，prompt 裡直接餵 Jira 票的原文（避免主 session 轉述時遺漏細節），並要求它逐條回報改了什麼、沒改什麼、原因為何。
2. 驗收（Verify）：主 session 不輕信 subagent 口頭說的「我改好了」，一定自己執行 git diff 加上 typecheck / lint，全部通過才准許 commit。
3. 審查（Review）：每個 task 通過驗收後，另外派一隻全新 context 的 reviewer subagent 來挑毛病；只要抓出問題就再派 fix subagent 修正，並重新跑完「驗收 → 審查」直到完全乾淨。
4. 終審（Final Review）：所有 task 都收斂後，切到最強的 model 派一隻 whole-branch reviewer 做全分支總體檢，確認無誤才開 PR。

這樣分工的好處很明顯：主 session 的 context 永遠保持乾淨，只裝「整體計畫與驗收狀態」，不會被龐大的程式碼細節塞爆；寫 code 的跟審 code 的是不同 agent，不會有「自己審自己」的盲點；而且每個角色還能依照任務風險高低指定不同的 model。搭配前面做的 tmux 整合，這些背景 subagent 在 cmd+p 預覽裡全都能即時監控，window 也會穩穩維持在執行中狀態，直到最後一隻 subagent 交差。

### 目前的代價與取捨

這套做法唯一的痛點是非常吃本機硬體資源。每個 task 做完都要跑一次 pnpm nx affected -t=typecheck,lint，在大型 monorepo 裡 typecheck 本來就是吃效能怪獸。

加上多視窗平行開發，好幾個 window 同時在跑驗收時，CPU 和記憶體會瞬間飆高，連帶讓編輯器和瀏覽器一起變頓。

此外，每個 worktree 都有自己獨立的 node_modules 和 Nx cache，預設互不共用，等於每次開新 worktree 的第一次驗收都是冷啟動重跑，再加上每個 task 配一隻 reviewer、最後還有一隻全分支 reviewer，時間與 token 消耗都直接翻倍。

目前的折衷方案是嚴格限制只跑 affected（只驗證這次改動波及的專案），並靠自己體感控制同時開工的視窗上限。

至於讓多個 window 的驗收任務自動排隊輪流跑，大概就是下一步準備優化的方向了。

## 與 herdr 比較：有什麼可借鑑？需要換嗎？

最近社群上討論度很高的 **herdr**，是一個專為 coding agent 設計的 terminal workspace manager，Flavio Copes 形容它是「tmux rebuilt around agents」。它用 Rust 寫成單一 binary，本身就是獨立的 multiplexer，而不是 tmux plugin。

既然最近剛好有這個現成的熱門工具，我也順手研究了一下它跟這套自組工作流的差異，看看有什麼設計值得借鑑，以及我自己需不需要換過去。

### 兩邊在解同一個問題

拆開來看，兩邊解決的痛點幾乎一樣：同時跑多個 agent、知道哪個在等我、一鍵跳過去。herdr 左側 sidebar 列出每個 workspace 與 agent 狀態，對應到我這邊的 tmux 狀態列加上 `cmd+p` picker；herdr 的 workspace 則對應我這邊「一個 worktree 一個 window」。

真正的差異不在「能不能平行」，而在底層取捨：

| 比較面向              | 我的 tmux + Claude Code                                  | herdr (0.9)                                       |
| :-------------------- | :------------------------------------------------------- | :------------------------------------------------ |
| **定位與支援**        | 既有 tmux 擴充，僅支援 Claude Code                       | 獨立 multiplexer，支援多種 CLI agent              |
| **狀態偵測**          | 靠 hooks 主動回報（抓得到 subagent、API error）          | 預設讀畫面判斷（通用但偶爾會漏判）                |
| **重開機復原**        | 自動 `claude --resume` 回原 session 與目錄               | 還原 layout 後變新 shell（需裝 integration 接回） |
| **Worktree / Review** | 選單看 PR 狀態、安全刪 worktree、`cmd+r` 跨目錄 diffview | 僅內建基礎 worktree 指令，無 PR 整合與 review     |
| **Agent 協作**        | 靠 Claude Code 原生 subagent，session 互不相通           | 提供 socket API，讓 agent 自己開 pane、互讀畫面   |
| **平台與維護**        | 限 macOS（Ghostty / bash 3.2），自己維護腳本             | 跨 macOS / Linux / Windows，`brew` 安裝、團隊維護 |

### 有什麼值得借鑑？

研究完之後，herdr 有兩個設計讓我覺得很值得參考，也是我接下來想補進自己工作流的方向：

1. **Socket API**：herdr 開放了 CLI 與 socket API，讓 agent 可以自己開 pane、甚至讀取其他 agent 的畫面。我之後如果想做 headless loop，讓一個主 session 派工給另一個 session 再讀回結果，這正是目前缺的一塊拼圖。
2. **常駐的 Sidebar 狀態總覽**：herdr 把所有 workspace 與狀態常駐在左側 sidebar，比起我現在必須按 `cmd+p` 叫出選單才看得到全貌，視覺上更直觀。

### 結論：目前需要換嗎？

對我來說答案是不換，原因有三個：

1. **只用 Claude Code**：herdr 最大的賣點是統一管理多種 agent，這點我用不到；反過來，它為了通用而改用讀畫面判斷狀態，精準度比不上直接吃 hooks。
2. **換過去會掉功能**：我最依賴的三件事是「背景 subagent 可見」、「重開後自動接回對話」、「安全刪 worktree」。第一件 herdr 做不到同樣細，第二件要額外裝 integration，第三件目前沒看到。
3. **轉換成本高**：快捷鍵、Ghostty 綁定、picker 都已是肌肉記憶，重頭適應的時間比維護現有腳本還多。

**什麼時候會重新考慮？** 開始重度混用 Codex 等其他 agent、要把工作流推給沒用 tmux 的隊友、Claude Code 改版導致維護 hooks 成本過高，或是未來 herdr 原生補上 hooks 狀態偵測與無痛 resume。

**給讀者的建議**：如果你還沒在用 tmux、或同時在用多種 agent，直接裝現成的 herdr 會比照著這篇自己組省事很多。
