---
title: 'Design Pattern - Adapter Pattern'
description: '在開發過程中，我們常面臨這種尷尬的困境，就是現有的程式碼明明能完美解決問題，但它的呼叫方式（介面）卻跟我們的系統對不上去。'
pubDate: 'April 16 2026'
heroImage: ''
tags: ['Design-Pattern', 'TypeScript', 'OOP']
category: '軟體設計'
---

在開發過程中，我們常面臨這種尷尬的困境，就是現有的程式碼明明能完美解決問題，但它的呼叫方式（介面）卻跟我們的系統對不上去。

這種情況就有些麻煩了，因為如果那是第三方 SDK，你可能也沒辦法改，如果是已經運作多年的老舊模組，除非你非常了解，不然你可能也不敢改，畢竟風險太大。

而 Adapter Pattern 要解決的就是這樣的問題，既然兩邊都不能改，那就加一層「轉接器」在中間做翻譯，讓原本不相容的兩端順利對接那就行了。

## 一、核心概念

Adapter Pattern（轉接器模式）是一種結構型設計模式，它的核心價值在於：讓原本因為「介面不相容」而無法一起工作的類別，能夠無縫協同運作。

- 本質（Wrapper & Translator）：Adapter 扮演著「包裝器」與「翻譯官」的角色。它用系統期待的介面把舊程式碼包起來，將對外的請求「翻譯」成舊程式碼看得懂的格式。
- 職責單一：Adapter 不新增任何業務邏輯。它的唯一任務是處理介面的落差（如方法名稱、參數結構、資料型別、回傳格式）。
- 零侵入（Zero Intrusion）：主系統（呼叫端）繼續遵循自己的規範，舊程式碼（被轉接者）維持原樣，雙方的耦合度降到最低。

## 二、生活例子

你帶著最新的 Mac 筆電去客戶公司簡報，筆電只有 HDMI 介面，但會議室的舊投影機只支援 VGA 訊號。

- 舊投影機 → Adaptee（被轉接者）：擁有顯示畫面的能力，但只接受 VGA 類比訊號。
- HDMI 規格 → Target（目標介面）：筆電期待的輸出規格。
- Mac 筆電 → Client（呼叫端）：發出簡報訊號，只知道怎麼輸出 HDMI。
- 轉接線 → Adapter（轉接器）：一頭插筆電（HDMI），一頭插投影機（VGA），把數位訊號即時轉成類比訊號。

> 關鍵：轉接線自己不會播放畫面，它只做訊號轉換。筆電不用拆開重焊主機板，投影機也不必砸錢換新，兩邊完美對接。

## 三、程式碼實作：整合舊支付套件

系統定義了統一的付款介面 `PaymentProcessor`，但手上有一套舊的支付套件 `OldPaySystem`，功能沒問題，只是介面長得不一樣。

### Step 1：Target（系統期待的介面）

```ts
interface PaymentProcessor {
  pay(amount: number, currency: string): void;
}
```

### Step 2：Adaptee（無法修改的舊套件）

方法名稱不同，參數也改用一個物件傳入：

```ts
class OldPaySystem {
  sendMoney(order: { total: number; currencyCode: string }): void {
    console.log(`[OldPay] 支付 ${order.total} ${order.currencyCode}`);
  }
}
```

### Step 3：Adapter（負責轉換）

Adapter **實作新介面**，內部**持有舊物件**，把呼叫轉過去：

```ts
class OldPayAdapter implements PaymentProcessor {
  constructor(private readonly oldPay: OldPaySystem) {}

  pay(amount: number, currency: string): void {
    // 只做轉換：新的呼叫方式 → 舊的呼叫方式
    this.oldPay.sendMoney({ total: amount, currencyCode: currency });
  }
}
```

### Step 4：Client（只認識 Target）

```ts
function checkout(processor: PaymentProcessor, amount: number, currency: string): void {
  processor.pay(amount, currency);
}

checkout(new OldPayAdapter(new OldPaySystem()), 1500, 'TWD');
// [OldPay] 支付 1500 TWD
```

`checkout` 完全不知道背後是舊套件。這就是 Adapter 的全部骨架：**一個實作新介面、內部呼叫舊物件的類別。**

### 換成新套件時

將來要換成新的支付套件，只要再寫一個 Adapter：

```ts
class NewPaySDK {
  charge(value: number, currency: string): void {
    console.log(`[NewPay] 收款 ${value} ${currency}`);
  }
}

class NewPayAdapter implements PaymentProcessor {
  constructor(private readonly sdk: NewPaySDK) {}

  pay(amount: number, currency: string): void {
    this.sdk.charge(amount, currency);
  }
}

checkout(new NewPayAdapter(new NewPaySDK()), 1500, 'TWD'); // checkout 不用改
```

這是 Adapter 帶來的好處：**第三方套件被隔離在 Adapter 裡。** 換套件、升級套件，影響範圍只有 Adapter 本身，業務邏輯完全不會動到。

## 四、兩種實作方式

- **物件轉接器（Object Adapter）**：Adapter **持有** Adaptee 的實例（組合）。上面的範例都是這種，也是推薦的寫法。
- **類別轉接器（Class Adapter）**：Adapter **繼承** Adaptee。較少使用。

不推薦繼承的原因：繼承會把 Adaptee 的**所有公開方法一起暴露出去**。呼叫端可以繞過 Adapter，直接呼叫舊方法，轉接就失去意義了。

### 更輕量的形式：轉換函式

Adapter 不一定要寫成 class。當落差只在**資料格式**時，一個轉換函式就夠了：

```ts
// 外部來源的格式（無法控制）
interface UserDTO {
  user_id: number;
  display_name: string;
}

// 系統內部使用的格式
interface User {
  id: number;
  name: string;
}

// Adapter：把外部格式轉成內部格式
function toUser(dto: UserDTO): User {
  return { id: dto.user_id, name: dto.display_name };
}
```

外部格式改了欄位名稱，只需要改 `toUser` 一處，系統內所有用到 `User` 的地方都不用動。

這種「外部格式 → 內部格式」的轉換，在系統的每一層都很常見：

- **前端**：後端 API 的回應，轉成畫面使用的資料模型。
- **後端**：第三方服務（金流、物流、簡訊）的回應，轉成系統內部的物件。
- **資料存取**：資料庫查詢結果的欄位，轉成程式中的物件。
- **系統整合**：舊系統輸出的 XML，轉成新系統使用的 JSON。

## 五、運作原理與設計原則剖析

- 單一職責原則（Single Responsibility Principle, SRP）
  介面轉換與資料格式調整的邏輯全部封裝在 Adapter 裡面。主業務邏輯不必混雜任何舊套件的呼叫方式或格式轉譯程式碼，職責邊界非常清晰。
- 開放封閉原則（Open-Closed Principle, OCP）
  如果未來要對接另一個第三方支付（如 EuroPay），只需要新增一個 `EuroPayAdapter`，完全不需要修改現有的 checkout（或 `processOrder`）業務邏輯。對擴充開放，對修改封閉。
- 透明性（Transparency）
  對 Client（呼叫端）而言，Adapter 完全是透明的。Client 依然只關注並呼叫標準的 Target 介面（`PaymentProcessor`），根本不需要關心背後是由哪個具體 SDK 或舊系統在運作。

## 六、常見使用情境與優缺點評估

### 使用情境

- 整合第三方 SDK / 套件：當外部套件的 API 規範與系統內部介面不一致，且無法直接修改第三方原始碼時。
- legacy 舊系統重構：需要保留穩定運作的舊模組，但想讓它配合全新設計的架構運作（漸進式重構）。
- 資料格式與協定轉譯：處理跨層級或跨系統的資料傳送，例如將外部 API（DTO）轉為內部領域模型（Entity），或 XML 與 JSON 格式轉換。
- 封裝變動風險：希望將可能變更的外部依賴隔離在特定區域，確保業務主邏輯不隨外部套件升級或更換而受影響。

### 優缺點評估

- 優點
  - 符合 SRP 與 OCP：轉接邏輯獨立封裝；擴充新套件只需新增 Adapter，無需動到核心業務邏輯。
  - 提高程式碼可複用性：讓原先因介面不相容而面臨淘汰的舊模組得以繼續發揮價值。
- 缺點
  - 增加系統複雜度：每多一種轉接都需要額外定義 class 或介面，若轉接層數過多容易導致程式碼結構過於繁雜。
  - 無法憑空補充功能：Adapter 只能轉換介面，若舊套件本身缺乏某項關鍵功能，轉接器無法獨立解決問題。
