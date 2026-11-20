---
title: '為何在 Multi-Agent 平行開發會造成分支污染'
description: '多個 AI Agent 平行開發時 commit 亂成一團，常被當成 LLM 遺忘脈絡或幻覺，其實是所有 Agent 共用同一個工作區、缺少隔離的必然結果。'
pubDate: 'July 12 2026'
heroImage: ''
tags: ['Git', 'AI', 'Multi-Agent']
category: '開發工具'
---

很多人都有一個誤解，覺得是不是 AI 模型記不住，但其實是你的工作區根本沒有做環境隔離。

在引入 AI Agent 協助平行開發時，許多團隊會遇到這種詭異現象：明明給了各個 Agent 不同的 Prompt、 assigns 了不同的 Ticket，但最後 commit 卻亂成一團，A 分支的程式碼跑到 B 分支，甚至發生 Agent 互相還原對方程式碼的慘劇。

很多人以為這是 LLM 遺忘脈絡（Context Loss）或幻覺（Hallucination），但深入底層你會發現：這是軟體架構與工作區隔離（Isolation）設計缺陷導致的必然結果。

## 一、機制剖析

當多個 Agent Session 同時運作在同一個專案目錄下時，存在四個致命的系統性盲點：

### 1. Branch 是「全域狀態」，不是「Session 狀態」

Git 的 `git checkout` 或 `git switch` 作用對象是整個 Working Tree（工作區）。

- 情境：Agent A 切換到 `feature-A` 開始寫 Code；此時 Agent B 執行 `git checkout feature-B`。
- 後果：整個目錄瞬間變成 feature-B，而 Agent A 完全不會收到任何通知。Agent A 下一次執行 commit 時，程式碼就會結結實實地落到 Agent B 的分支上。

### 2. Agent 對 Branch 的認知是「快照」，而非即時

Agent 在 Session 啟動時被注入的 `gitStatus` 只是那一刻的事實。在此之後，Agent 認為自己在哪條 Branch，純粹靠它的「記憶（Context）」，而不是每次操作前都會再次執行 `git branch` 查證。

### 3. 分工分的是 Prompt，而不是實體工作區

我們常常將 Prompt 按照票號切分，但多個 Session 背後卻共用同一個 `.git` 目錄與同一份實體檔案。`git stash` / `git checkout` / `git reset` 等操作會直接影響並覆蓋彼此未 commit 的改動。

### 4. 團隊規範沒有真正的「執行者（Enforcer）」

許多團隊在 `CLAUDE.md` 或 `AGENTS.md` 寫滿了規範，但內部機制通常標註著 “None of it is machine-enforced”。如果 `.git/hooks/` 底下全是預設的 `.sample` 檔，Git 自身絕不會主動阻攔「這個 commit 是否投遞到正確分支」。

## 二、解法：環境約束

要徹底解決 Multi-Agent 的分支混亂問題，不能指望 AI 「變聰明」或「更聽話」，必須從軟體工程與 Git 架構上進行硬性約束：

```
主 Repo (Base / Read-Only) ─── 唯讀基地 (僅處理 fetch / 開收 worktree)
     ├── Worktree A (SD-24658) ─── Agent Session A (僅對該目錄進行操作)
     └── Worktree B (SD-25357) ─── Agent Session B (僅對該目錄進行操作)
```

### 解法 1：一個 Agent 配一個 Git Worktree

過去在使用 Worktree 最讓人頭痛的是解衝突，但現在環境下 AI 可以很輕鬆的在 PR 上疊加 PR，解衝突也十分簡單，只要設置好明確的邊界即可

- 做法：每一個 Agent Session 必須限定在其獨立的 `git worktree` 目錄下運作。

- 關鍵指令：Agent 執行 Git 指令時，一律使用 `git -C <worktree-path>`，嚴禁使用 cd 或全域切換。

- 效果：Branch 被實體目錄綁定，從物理構造上切斷「A 切分支影響 B」的可能性。這是唯一 By-Construction 的解法。

### 解法 2：主 Repo 降級為「唯讀」

- 主工作區（Main Repo）不再參與任何票號的開發與解 Bug。
- 主工作區僅用於 `git fetch` 以及管理 Worktrees 的建立與銷毀。

### 解法 3：加入 Git Pre-commit Hook 做分支強斷言（Branch Assertion）

在環境中加上防呆與強制約束機制：

1. 為每個 Worktree 設定預期的分支名稱：
   `git config branch.expected <branch-name>`
2. 在 Pre-commit Hook 中比對當前 HEAD：
   `git symbolic-ref --short HEAD`
3. 若當前分支與 `branch.expected` 不符，直接中斷提交（`exit 1`）。
   - 優點：成本極低、15 行 Shell Script 即可搞定，且具備真正的機器強制力（Machine-Enforced）。

### 解法 4：跨 Session 分工「按檔案切分」，切不開就序列化

- 按檔案隔離：如果兩張票必須修改同一支檔案（例如 `return-drawer-schema.ts`），則不能平行發放給兩個 Agent。
- 序列化執行：無法切分檔案邊界的任務，必須強制「先做完一張、Commit 並 Merge 後，再開下一張」，避免全檔覆蓋毀壞變更。

## stash 隱患

在多 Session / 多 Agent 環境下，`git stash` 是一個極度危險的隱患。因為 Stash 是全域堆疊（Global Stack），任何 Session 都可以 pop 出別人的暫存變更。

若目前 Stash 中仍留有如「跨票號散改的探索性程式碼」，建議盡快落實（Commit）到專屬分支或清除，切勿讓 Stash 成為平行開發時的「不定時炸彈」。

## 結語

其實說到底，Multi-Agent 平行開發其實就是把原本的開發流程，從「單執行緒」變成「多執行緒併發」。

但當多個 Agent 同時開始工作時，就會遇到跟多執行緒程式很類似的問題。如果只靠 LLM 自己記住規則，或是在 `CLAUDE.md` 裡不斷補充注意事項，就像寫多執行緒程式卻沒有加 Lock，只希望每個執行緒都能乖乖遵守規則一樣，多少還是有點冒險。

與其一直增加 Prompt，提醒 AI 不要切錯分支、不要動到其他 Agent 的檔案，我覺得更好的方式還是回到工程本身：使用 Git Worktree 隔離各自的工作區，再透過 Pre-commit Hook 確保每個 Agent 都遵守既定的開發規範。

畢竟，與其期待 AI 永遠記得所有規則，不如直接從環境與工具上避免問題發生。這樣每個 Agent 都能在自己的工作區裡獨立開發，也不用一直擔心彼此的修改互相干擾。
