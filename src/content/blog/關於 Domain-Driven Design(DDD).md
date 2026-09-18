---
title: '關於 Domain-Driven Design (DDD)'
description: '自數位轉型年代開始，軟體開發領域開始流行 DDD 一詞的說法，所謂領域驅動設計 Domain-Driven Design (DDD) 是一種軟體設計方法論，核心目的是讓程式設計與商業邏輯緊密對齊，以便未來因應商業需求變更。'
pubDate: 'September 20 2025'
heroImage: ''
tags: ['DDD', 'Clean-Architecture', 'X-Driven']
category: 'Development'
---

自數位轉型年代開始，軟體開發領域開始流行 DDD 一詞的說法，所謂領域驅動設計 Domain-Driven Design (DDD) 是一種軟體設計方法論，核心目的是讓程式設計與商業邏輯緊密對齊，以便未來因應商業需求變更。

不過這只是比較簡單的說法，這個方法論涉及的概念與層次的範圍太大，現實的情境往往更複雜且多樣，很難有一個標準化範例能完全套用。

此篇主要初步介紹 DDD，有興趣就可以根據關鍵字往下深入研究。

## 前言

其實現今在軟體開發中，應該都是往 DDD 靠攏，在面對快速變化的商業節奏與不斷擴充的系統規模，勢必是需要一個有效的管理方式，以利於未來維護與擴充，免得當一個新的需求下來時，形成牽一髮動全身的情境。

不過在實務落地上不簡單，DDD 通常會結合 Clean Architecture 等架構思維，透過控制反轉（Dependency Injection, DI）與依賴反轉原則（Dependency Inversion Principle, DIP）達成高內聚、低耦合，並確保模組符合單一職責原則（Single Responsibility Principle, SRP）。

## Domain 是什麼

在開始之前，先了解在 Domain-Driven Design 中的 Domain 是什麼？

> a specified sphere of "activity" or "knowledge".
>
> 一個明確界定的活動與知識範圍。

它可以是一個產業（例如金融、電商），也可以是更細的子領域（例如支付、訂單管理）。

- Activity：活動涉及 stakeholders（利害關係人），他們的行為與決策定義了業務運作的邊界。
- Knowledge：知識代表 know-how，包含業務面臨的問題域與對應的解決方案。

而一個好的 Domain 模型應具備高內聚、低耦合，讓資料與商業邏輯集中於自身，並盡量降低對其他 Domain 的依賴，使各個領域維持清晰且獨立的邊界。

## 為什麼需要 DDD

在 2003 年 Eric Evans 出版的《Domain-Driven Design: Tackling Complexity in the Heart of Software》書中就有提到，DDD 並非一組框架或工具，而是一種「以領域模型為核心的思考方式」，目標是處理軟體開發中複雜的業務需求。

自從軟體開發從技術導向慢慢走向 業務導向（business-oriented），開發團隊也開始意識到，許多失敗的專案並非技術不足，而是開發者與業務人員之間缺乏共通語言。

它強調團隊應建立一套 **Ubiquitous Language（通用語言）**，讓商業邏輯能直接映射到模型與程式碼中，減少認知落差與溝通成本。

![Ubiquitous Language](https://softengbook.org/articles/figs/ubiquitous-language.svg)

Ref: [Domain-Driven Design (DDD): 1.2 Ubiquitous Language](https://softengbook.org/articles/ddd)

## DDD 的實務重點

1. **建立通用語言（Ubiquitous Language）：** 與領域專家 (Domain Expert) 密切合作，定期舉行 [事件風暴（Event Storming）](https://zh.wikipedia.org/zh-tw/%E4%BA%8B%E4%BB%B6%E9%A2%A8%E6%9A%B4)，讓技術與非技術人員共同識別業務流程與痛點。

2. **切分子領域並專注核心：**
   - **核心領域 (Core Domain)：** 最具競爭力的核心業務，應由內部團隊主導開發。
   - **支援子領域 (Supporting Subdomain)：** 業務所需但非核心，可使用現成工具（如 ERP、CRM）。
   - **通用子領域 (Generic Subdomain)：** 標準化功能（如身份驗證、第三方支付），可考慮外包或整合現有服務。

3. **劃分限界上下文（[Bounded Context](https://martinfowler.com/bliki/BoundedContext.html)）：** 根據商業邏輯劃分清晰的語意邊界，確保每個上下文擁有獨立的模型與語言（例如「商品」在倉儲系統與商城系統有不同定義）。

4. **採用戰術設計模式：** 運用物件導向與架構模式，維護程式碼內部一致性（詳見下文）。

5. **確保需求與系統一致：** 透過事件風暴與 [Specification by Example](https://en.wikipedia.org/wiki/Specification_by_example) 共同定義需求與測試案例。

## 戰略設計 & 戰術設計

![DDD](/ddd.png)

Ref: [Domain-Driven Design Reference](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)

DDD 的設計模式主要分為兩大維度：

**戰略設計 (Strategic Design)** 負責劃分系統邊界，**戰術設計 (Tactical Design)** 負責落實程式碼結構，兩者透過通用語言串連。

### 1. 戰略設計 (Strategic Design) ：劃分邊界

- 領域（Domain）與子領域（Subdomain）： 企業的業務範圍。透過區分核心、支援、通用子領域，幫助團隊決定開發優先順序與資源分配。
- 限界上下文（Bounded Context）： 為模型定義明確的邊界。每個邊界內擁有專屬的模型與語言，並透過 Context Map 描述上下文之間的協作機制。
- 通用語言（Ubiquitous Language）： 業務與技術團隊共同維護的術語庫。例如「訂單 (Order)」在會議、規格書到程式碼變數命名中皆保持一致。

以打獵來舉例的話，今天有一個部落，準備組織一支隊伍去森林打獵

戰略設計會關注在「我們要怎麼分工，才能讓整個狩獵過程順利進行？」

像是「追蹤獵物的人，需要知道怎麼保存肉嗎？」、「負責保存肉的人，需要知道怎麼追蹤獵物嗎？」

完全不需要，每個人只要專注在自己的任務即可，並透過明確的方法來溝通協作。

### 2. 戰術設計 (Tactical Design) ：落實程式碼架構

那戰術設計的話，就有點像是我已經被賦予「獵人」的職責了

那我就要思考「身為一名獵人，我到底需要做哪些事情？」

我會要「判斷獵物的位置」、「部屬陷阱」、「選擇適合的武器對應獵物」、「追蹤或攻擊獵物」、「確保獵物成功捕獲」

這些其實就是「獵人」這個領域中的行為與商業規則。

而戰術設計，就是進一步思考如何將這些領域中的概念、行為與規則具體化成程式碼中的模型，例如 Entity、Value Object、Aggregate、Repository、Domain Event、Factory 等。

你可以理解為「將商業規則封裝在領域模型中，讓物件自己負責維護自身的狀態與規則，避免外部程式直接修改資料而破壞領域規則。」

以下為整理各個戰術元件的職責與對照：

| 戰術元件                    | 核心目的與實務痛點                                                                            | 一句話理解                                                           |
| :-------------------------- | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------------------- |
| **Entity (實體)**           | 具有唯一 ID，狀態會隨時間改變。需要關注其生命週期與狀態變化。                                 | 「小明」改名後依然是 ID=1 的小明。                                   |
| **Value Object (值物件)**   | 無 ID、不可變（Immutable），內容相同即相等。用來封裝屬性與格式驗證，避免 `if/else` 邏輯散落。 | 「100 元」或「台北市信義區」，重視屬性本身而非身份。                 |
| **Aggregate (聚合)**        | 將高度相關的 Entity 與 Value Object 包裹為單一交易邊界，確保資料一致性。                      | 購物車與裡面的品項，必須作為一個整體處理。                           |
| **Aggregate Root (聚合根)** | 聚合的唯一對外窗口。外部只能跟隊長互動，禁止私下修改內部物件導致商業規則破壞。                | 隊長角色。外部不能直接改品項金額，只能透過「隊長」執行下單與算總價。 |
| **Repository (倉儲)**       | 封裝資料持久化細節，商業邏輯層完全無感於底層（SQL/MongoDB/Redis）的變化。                     | 告訴系統「幫我拿/存這筆訂單」，不管底下是 MySQL 還是 MongoDB。       |
| **Domain Event (領域事件)** | 紀錄業務上發生的重要事件（如 `OrderPlaced`），作為跨上下文與服務解耦的手段。                  | 訂單成立後發出事件，讓「發信、扣庫存」等其他模組自發響應（解耦）。   |
| **Factory (工廠)**          | 當建立複雜物件或聚合的流程太龐雜時，抽離專門的 Factory 負責建構邏輯。                         | 物件建構過程太複雜時，交給工廠專門製造。                             |

## 什麼時候不要用 DDD

- 問題領域過於簡單：

  如果系統主要是做資料的增刪改查 (CRUD)，沒有複雜的商業規則、不變條件也不多，就用 DDD 的各種模式（聚合、事件、上下文界定等）反而會造成設計過度（over-engineering），且帶來較高的維護成本。

- 問題夠複雜，但屬於非核心領域：

  有些系統挑戰在於性能、分散式系統、資料流、第三方整合或基礎設施等，而非業務需求，這些情況 DDD 的模型抽象對解決這種技術性挑戰幫助就會相對較少，有時還反而會阻礙對技術問題的直接處理。

- 缺乏領域專家 (Domain Expert) 或領域知識不足：

  DDD 的一大關鍵是通用語言 (Ubiquitous Language) 與領域專家的密切合作，如果沒辦法得到明確與持續的領域知識，就會造成模型模糊，還容易產生誤解。

- 短期專案，快速交付為導向：

  如果專案時間短、資源有限、需求變化小，但時程壓力大，用 DDD 的抽象／設計／設計模型迭代等可能會花費額外開發與協調成本，這些可能造成專案超時或成本超出預期。

- 組織文化或流程不支持演化與協作：

  因為 DDD 要求開發者、業務、架構師之間頻繁溝通、持續重構模型、適應變化。如果組織流程固定、變動少或對變動（refactoring）會抵抗，這些阻力可能就會讓 DDD 的成本被放大。

## 結語

其實 DDD 就像是一套「軟體設計哲學與心法」。

它不綁定任何程式語言或框架，所以不論你是在寫 Java、TypeScript、Go，還是在設計微服務、寫 BDD 測試規格，甚至是做系統分析，都會不斷看到 DDD 的觀念以各種型態重複出現。

這也是為什麼會需要了解 DDD 的核心概念，當搞通之後看到許多當代軟體架構的視角就會變得非常清晰～

## 參考來源

- [第一隻豬:DDD的Domain是什麼意思](https://www.youtube.com/watch?v=Bn2T0Z1KSTM)
- [關於 Domain-Driven Design 以及他的魅力](https://ithelp.ithome.com.tw/m/articles/10216645)
- [DDD 學習路徑與資源分享](https://ithelp.ithome.com.tw/m/articles/10216792)
