---
title: '關於我從 VSCode 家族遷移到 Neovim'
description: '其實很早以前就已經認識 neovim 但一直覺得學習成本很高划不來，直到開始工作一段時間後，因為開發已經需要跟AI協作，再多任務處理下加上開發環境跑lint, git push 什麼的，感覺到 cursor 很卡，甚至是在一些大型專案下啟動速度也有些微慢，且一段時間後都要整個重開才會順，讓我滿頭痛的。'
pubDate: 'September 7 2026'
heroImage: ''
tags: ['Neovim', 'Tmux', 'Dev-Environment']
category: '開發工具'
---

其實很早以前就已經認識 neovim 但一直覺得學習成本很高划不來，直到開始工作一段時間後，因為開發已經需要跟AI協作，再多任務處理下加上開發環境跑lint, `git push` 什麼的，感覺到 cursor 很卡，甚至是在一些大型專案下啟動速度也有些微慢，且一段時間後都要整個重開才會順，讓我滿頭痛的。

到這時候才決定換到 neovim 試試，過去 neovim 因為要安裝的插件非常多，包含環境設定上有些複雜，因此光是要把環境搞好就好花不少時間，但現在有 lazyvim 之後安裝已經非常輕鬆。

## Neovim 介紹

首先先介紹一下 neovim 是什麼，以及他的歷史由來，跟lazyvim 又有什麼關聯？

1991 基於 Vi 編輯器開發出 Vim（Vi IMproved），Vim 模式編輯（Normal/Insert/Visual）與極高效的鍵盤操作成為許多系統工程師的開發利器。

但隨著專案增長，Vim 爆出嚴重的技術債，且原始碼古老難以維護，而 PR 經常被拒絕和忽略，因此又被稱獨裁審核制。

後來 2014 年因為停滯更新的 Vim 遭到社群抗爭，發起群眾募資推出 Neovim，也將程式碼整個大重構，並引入 Lua 相較於傳統 Vimscript 更高效率、更靈活的擴充腳本語言，也擴增了 LSP 支援，讓程式碼補全和畫面不在卡頓。

到 2020年後，正式內建 LSP (Language Server Protocol) 與 Treesitter（語法樹解析），同時湧入大量的現代化插件，開發體驗逼近甚至能夠超越現代 IDE。

2022年起，因為從零用 Lua 配置 Neovim 門檻極高，社群推出了開箱即用的Distro（發行版），如 NvChad、AstroNvim 與 LazyVim。基於靈活的 lazy.nvim 套件管理器，提供了極致的模組化設計、極快啟動速度與漂亮的預設介面，成為目前最受歡迎的配置方案。

## Neovim 與 VSCode 比較

在現代與 AI 協作開發情境下很多時候都會在 Terminal 運行，如果想要完全在 Terminal 上開發或是習慣用 CLI 選 Neovim 肯定沒錯

另外，Neovim 用得好可以完全不依賴滑鼠，全靠鍵盤即可完成所有操作

這邊做了個表格比較一下兩者差異：

| 比較維度                 | Neovim                                                                                  | VSCode / Cursor                                                             |
| :----------------------- | :-------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------- |
| **啟動速度與記憶體占用** | **極致（毫秒級）**<br>無 GUI 冗餘，幾十 MB 記憶體即可運行                               | **中等至較高**<br>基於 Electron，啟動約 1-3 秒，開多個分頁常占 1-2GB+       |
| **大專案／巨型檔案效能** | **極度流暢**<br>底層 Tree-sitter 高亮與 C/Lua 架構，不卡頓                              | **容易卡頓**<br>載入海量文字或數十萬行 Mono-repo 時易出現輸入延遲           |
| **主導權與客製化深度**   | **掌控權高**<br>從鍵位組合、介面元件到事件邏輯，全由 Lua 設定檔決定                     | **中等**<br>仰賴外掛與官方選單，GUI 佈局與底層邏輯無法大幅改動              |
| **圖形介面與視覺體驗**   | **純 TUI (Terminal)**<br>簡潔無噪音，高度依賴鍵盤；UI 視覺上限受 Terminal 限制          | **頂級 GUI**<br>開箱即用的鼠標操作、拖拽分割、富文本提示與視覺化排版        |
| **AI 輔助整合**          | **可設定，但需折騰**<br>可透過 `copilot.vim` 或 `avante.nvim` 整合，但介面不如 GUI 直覺 | **體驗頂峰**<br>Copilot、Cursor 的 Inline Edit、多檔 Agent 對話體驗極為順暢 |
| **Debugging (偵錯體驗)** | **上手門檻高**<br>需設定 `nvim-dap` 與 Adapter，設定繁瑣但設定好後極輕量                | **開箱即用**<br>圖形化 Breakpoints、變數監視（Watch）、Stack Trace 一目瞭然 |
| **設定與維護成本**       | **高**<br>需學習 Vim/Lua 語法，遭遇 Breaking Changes 時需自己修復配置                   | **極低**<br>點擊安裝外掛即可使用，同步 Settings Sync 即可跨平台復原         |

## 終端機：Ghostty vs tmux vs zsh

剛進 Terminal 開發時，會碰到的麻煩點就是「視窗管理」與「效能」。

- Ghostty：近期崛起且極度驚豔的 Terminal Emulator。它利用 GPU 加速，渲染效能極高，而且原生支援了非常漂亮的視窗分割（Splits）與 Tab 管理。
- tmux：Terminal 界的長青樹。最大的優勢在於 Session 持久化與遠端伺服器掛載。即便關掉 Terminal，背景的開發環境依然活著。
- zsh：最常見的預設 Shell，靠外掛能達到不錯的體驗，但開太多外掛後啟動速度容易變慢。

我的最終配置：
日常在地開發，我選擇 Ghostty 搭配 tmux。Ghostty 提供了極致順暢的字體渲染與低延遲輸入，而 tmux 則幫我固化開發環境（左邊開 Nvim，右下開 Server，右上開 Git）。就算 Ghostty 意外重啟，tmux session 依舊穩如泰山。

## Shell 互動體驗：fish-shell vs zsh-autosuggestions

自動補全與歷史紀錄搜尋是提升命令列效率的靈魂。

- zsh + zsh-autosuggestions：在 zsh 上模擬類似 fish 的歷史命令自動推薦。優點是不需要換掉預設 Shell，但設定一多容易感覺到微小的輸入延遲。
- fish-shell：開箱即用的現代化 Shell。它的語法自動補全、歷史搜尋與語法高亮是原生且極速的，完全不需要額外裝一堆重型外掛。

我的選擇：
我直接投奔了 fish-shell。那種「敲入幾個字母就自動淡色顯示過往命令，按下右方向鍵就補全」的原生流暢感，一旦用過就真的回不去了。（雖然 POSIX 不相容，但日常 Script 我依然指定 `#!/bin/bash` 執行，完全不影響開發）。

## 檔案與模糊搜尋：FzfLua vs telescope.nvim

在 Neovim 裡，如何快速找檔、找文本是決定開發速度的關鍵。

- telescope.nvim：Neovim 社群的絕對主流，生態系極度豐富，UI 漂亮且擴充性強（整合 Git、LSP 等無所不能）。缺點是在極大規模的 Mono-repo 專案下，效能有時會略顯疲態。
- FzfLua：基於 fzf 和 Lua 的搜尋神器。 UI 乾淨俐落，最大的優勢就是快！底層調用 C/Rust 寫的 fzf 二進位檔，面對海量檔案搜尋時依然是瞬間反應。

我的選擇：
我目前轉到了 FzfLua。雖然 Telescope 的外掛生態很豐富，但 FzfLua 帶來的「零延遲搜尋體驗」更貼近我當初離開 VSCode、追求極致效能的初衷。

## Dotfiles 管理：原生 Script vs stow vs chezmoi

換到 Neovim 與 Terminal 開發環境後，最讓人踏實的優點之一就是所有設定檔（Dotfiles）都能納入 Git 版控。但當要在全新機器上還原開發環境時，該如何優雅地同步這些設定？

在討論管理工具前，必須先提到各種方案背後的關鍵原因—軟連結（Symbolic Link / Symlink）。

軟連結（Symbolic Link，簡稱 Symlink） 的運作邏輯，可以用生活中的 「電腦桌面捷徑」 來完全類比。

簡單來說它是一個獨立的小檔案，裡面只寫著「另一個目標檔案或資料夾的路徑」。

在 Unix-like（macOS / Linux）系統中，每一個檔案的儲存都可以分成兩個部分：

- 檔案內容（Data Block）：真正儲存在硬碟上的文字、程式碼或圖片。
- 索引節點（Inode）與路徑：系統用來記錄「檔案名稱」與「資料在哪裡」的卡片。

當你建立一個軟連結時（例如執行 `ln -s ~/dotfiles/nvim ~/.config/nvim`）：

```text
[使用者 / 應用程式 (Neovim)]
         │
         ▼ 讀取路徑
[ ~/.config/nvim ] (這是一個軟連結檔案)
         │
         │ (系統發現它是 Symlink，讀取裡面寫的路徑)
         ▼ 指向目標
[ ~/dotfiles/nvim ] (真正的實體資料夾)
         │
         ▼ 存取真正的資料
[ 真正的硬碟區塊 (Data Block) ]
```

- 讀取時：當 Neovim 去開 `~/.config/nvim/init.lua` 時，作業系統會在底層自動轉向，替你打開 `~/dotfiles/nvim/init.lua` 的真正內容。
- 修改時：你在 `~/.config/nvim/init.lua` 存檔，實際上修改到的就是 `~/dotfiles/nvim/init.lua` 的實體檔案。

而 Dotfiles 管理的核心哲學，正是將分散在系統各處的設定檔集中於單一目錄管理。

為了讓這些集中儲存的設定檔能順利映射到系統預設的路徑（例如將 `~/dotfiles/nvim` 映射至 `~/.config/nvim`），我們便不需要手動去更改各個軟體的設定檔讀取邏輯。透過軟連結，作業系統會自動完成底層轉向，讓 Neovim、Tmux 或 Ghostty 依然能在它們習慣的位置讀到最新設定。

如此一來，既能將所有 Dotfiles 集中納入 Git 版控與跨裝置同步，又能避免設定檔與版控雜物散落各處，讓 $HOME 目錄始終保持乾淨整潔。

### 1. 原生 Shell 腳本流 (如 craftzdog 的 dotfiles)

這是 YouTuber/開發者 craftzdog 採用的經典極簡作法。不安裝額外軟體，完全依靠專案根目錄下的 `setup.sh` 或 `install.sh` 腳本，手動用 `ln -sf` 將專案裡的設定檔軟連結到 `~/.config/`。

- 優點：零外部依賴、高度客製化，還可以在腳本裡順便自動跑 `brew install` / `apt install` 安裝所有必備工具。
- 缺點：維護腳本需要自己處理邊界條件（如檔案已存在、目錄不存在等跨平台問題）。

### 2. GNU Stow

輕量級的專用軟連結管理工具。概念簡單，用 Unix 傳統的資料夾結構去對應 `$HOME` 即可，只要下 `stow .` 就會自動幫你建立所有軟連結（Symbolic Link / Symlink），學習曲線幾乎是零。

- 優點：簡單高效、指令極短，免去自己寫 `ln -s` 腳本的麻煩。
- 缺點：無法原生處理跨平台的差異性或加密敏感資訊。

### 3. chezmoi

功能極度強大的現代化 Dotfiles 管理器。支援 Go Template 模板、加密敏感資料（如 API Keys/SSH Keys），以及跨平台（macOS/Linux/Windows）變數轉換。

- 優點：安全、彈性極大，能完美處理多台異構機器間的設定差異。
- 缺點：有學習成本，指令與邏輯比 Stow/原生腳本複雜許多。

我的選擇：
如果你追求極致的自主掌控與自動化初始化，craftzdog 的原生 Shell 腳本 方式非常優雅且沒有負擔；但如果你的目標是快速上手、不想寫 Bash 判斷邏輯，GNU Stow 是 CP 值最高的方案；而需要管理多台不同作業系統或機密設定時，chezmoi 則是終極解法。
