---
title: 'Design Pattern - Strategy Pattern'
description: '在開發功能時，我們經常遇到同一個任務有多種做法，例如結帳時的折扣計算、地圖導航的路徑規劃。最直覺的寫法就是在主流程裡寫一長串 if/else 或 switch 來判斷當下該走哪套邏輯。'
pubDate: 'June 25 2026'
heroImage: ''
tags: ['Design-Pattern', 'TypeScript', 'OOP']
category: '軟體設計'
---

在開發功能時，我們經常遇到同一個任務有多種做法，例如結帳時的折扣計算、地圖導航的路徑規劃。最直覺的寫法就是在主流程裡寫一長串 if/else 或 switch 來判斷當下該走哪套邏輯。

隨著規則越加越多，這個核心函式會變成一個誰都不敢動的巨無霸——每次新增或修改一種規則，都得重新測試整段主流程。

Strategy Pattern（策略模式）處理的就是這個問題：把「演算法（怎麼做）」抽離成一個個獨立的物件，讓它們可以隨時替換，而不影響使用它們的主流程。

## 一、核心概念

Strategy Pattern（策略模式）是一種行為型（Behavioral）設計模式，它的核心是：定義一系列演算法，將每一個演算法封裝起來，並讓它們可以互相替換。

- 演算法與使用端解耦（Decouple Algorithm from Context）：主流程（Context）只負責推進業務步驟，把「具體怎麼算、怎麼處理」外包給策略物件。主流程不需要知道演算法內部的實作細節。

- 消除條件判斷（Eliminate Conditionals）：用「物件多型（Polymorphism）」取代散落在各處的 if/else 或 switch，把複雜的分支邏輯拆成各自獨立的小類別或函式。

- 執行時動態切換（Runtime Swapping）：因為策略是以組合（Composition）的方式注入主流程，系統可以在執行期間根據使用者選擇、系統狀態或設定檔，隨時抽換不同的策略。

- 獨立測試與維護（Isolated Testing）：每種策略都是獨立的單元，修改 VIP 折扣規則時，完全不會波及到一般會員或週年慶折扣，單元測試也只需要針對單一策略撰寫。

## 二、生活例子：出門交通方式

假設你每天早上要從家裡到公司，「抵達公司」是你的主要任務，但怎麼去有很多種選擇：

- 任務主體（Context）：你本人，目標是「從家裡移動到公司」。
- 交通方式規格（Strategy 介面）：只要能把你從 A 點送到 B 點的交通手段都算數。
- 具體交通方式（Concrete Strategy）：
  - 開車策略：速度快、不受天氣影響，但花錢且容易塞車。
  - 捷運策略：時間固定、不會塞車，但尖峰時段人擠人。
  - 騎單車策略：免費又健康，但遇到下雨天就不適合。

> 你不需要為了換一種交通方式，就把自己改造成不同的人（繼承）；你只需要在出門前根據今天的天氣與預算，「選擇」搭乘哪一種交通工具（組合）就好。

## 三、Strategy Pattern 的三個角色

Strategy Pattern 的結構非常單純，沒有像工廠模式那樣分出三種變體，主要由三個角色組成：

### 1. Strategy（策略介面）

定義所有支援的演算法或行為的共同介面。Context 透過這個介面來呼叫具體的演算法。

### 2. Concrete Strategy（具體策略）

實作 Strategy 介面的具體類別（或函式），各自封裝一種特定的演算法或業務規則。

### 3. Context（上下文 / 主流程）

維護一個對 Strategy 物件的參考（Reference）。Context 不自己實作演算法，而是將工作委派（Delegate）給目前的 Strategy 物件；同時通常會提供一個方法或建構子，讓外部可以傳入或替換策略。

## 四、程式碼實作：電商結帳折扣系統

以「電商結帳」為例：系統在計算訂單最終金額時，需要根據會員等級或活動套用不同的折扣規則（無折扣、VIP 8 折、滿千折百）。

### 4.1 壞味道：寫死的 if/else

在沒有使用 Strategy Pattern 之前，結帳邏輯通常長這樣：

```ts
type DiscountType = 'none' | 'vip' | 'threshold';

class CheckoutService {
  calculateTotal(amount: number, type: DiscountType): number {
    if (type === 'none') {
      return amount;
    } else if (type === 'vip') {
      return amount * 0.8;
    } else if (type === 'threshold') {
      return amount >= 1000 ? amount - 100 : amount;
    }
    return amount;
  }
}
```

當未來要加上「首購折 50」、「雙 11 限時折扣」、「員工價」時，`CheckoutService` 就會不斷膨脹，任何一個 else if 寫錯都可能搞壞整個結帳流程。

### 4.2 重構：套用 Strategy Pattern

我們把「計算折扣」這件事抽成獨立的策略介面，每種折扣各自成一個類別：

```ts
// 1. Strategy 介面：定義所有折扣策略的共同規格
interface DiscountStrategy {
  calculate(amount: number): number;
}

// 2. Concrete Strategies：各自封裝獨立的計算邏輯
class NoDiscount implements DiscountStrategy {
  calculate(amount: number): number {
    return amount;
  }
}

class VipDiscount implements DiscountStrategy {
  calculate(amount: number): number {
    return amount * 0.8;
  }
}

class ThresholdDiscount implements DiscountStrategy {
  calculate(amount: number): number {
    return amount >= 1000 ? amount - 100 : amount;
  }
}
```

接著讓主流程（Context）依賴抽象的 `DiscountStrategy`，而不是具體的折扣規則：

```ts
// 3. Context：負責結帳流程，將「怎麼算錢」委派給策略
class ShoppingCart {
  private strategy: DiscountStrategy;

  constructor(strategy: DiscountStrategy = new NoDiscount()) {
    this.strategy = strategy;
  }

  // 允許在執行期間動態更換策略
  setDiscountStrategy(strategy: DiscountStrategy): void {
    this.strategy = strategy;
  }

  checkout(amount: number): void {
    const finalPrice = this.strategy.calculate(amount);
    console.log(`原價：$${amount}，結帳金額：$${finalPrice}`);
  }
}
```

使用端可以隨時根據情境抽換策略：

```ts
const cart = new ShoppingCart(new NoDiscount());
cart.checkout(1200); // 原價：$1200，結帳金額：$1200

// 使用者登入 VIP 帳號，動態切換策略
cart.setDiscountStrategy(new VipDiscount());
cart.checkout(1200); // 原價：$1200，結帳金額：$960

// 改用滿千折百券
cart.setDiscountStrategy(new ThresholdDiscount());
cart.checkout(1200); // 原價：$1200，結帳金額：$1100
```

> 策略物件通常無狀態（Stateless）： 觀察上面的 `VipDiscount` 與 `ThresholdDiscount`，它們內部沒有儲存任何訂單資料，只接收參數並回傳結果。這代表同一個策略實例可以被多個購物車安全地重複使用，不需要每次結帳都 new 一個新的出來。

> 怎麼決定一開始要傳入哪個 Strategy？ 如果策略是由前端傳來的字串（例如 'vip'）決定，那「根據字串選出對應策略物件」這件事，正好就可以交給之前介紹的 Simple Factory 或對照表來處理！Factory 負責「生出對的策略」，Strategy 負責「執行對應的行為」。

### 4.3 更輕量的寫法：在 TypeScript 中直接用函式當策略

在 JavaScript / TypeScript 這類支援「一級函式（First-class Functions）」的語言裡，如果策略只有單一方法，其實不需要大費周章寫成一堆 class，直接用函式型別與對照表會更精簡：

```ts
// 策略就是一個純函式型別
type DiscountFn = (amount: number) => number;

const discountStrategies: Record<string, DiscountFn> = {
  none: (amount) => amount,
  vip: (amount) => amount * 0.8,
  threshold: (amount) => (amount >= 1000 ? amount - 100 : amount),
};

function checkout(amount: number, strategy: DiscountFn): number {
  return strategy(amount);
}

// 使用方式
const finalPrice = checkout(1200, discountStrategies['vip']); // 960
```

這種寫法保留了 Strategy Pattern 的所有精神（高內聚、低耦合、易擴充），同時省去了多餘的樣板程式碼（Boilerplate）。

### 4.4 容易混淆的模式

- Factory Pattern：關注的是物件的建立（「給我哪一個物件」）；Strategy 關注的是行為的替換（「用哪一種方式做事」）。兩者經常搭配使用。

- State Pattern（狀態模式）：結構與 Strategy 幾乎一模一樣，但意圖不同。Strategy 是由外部主動指定要換哪種演算法（例如使用者選了 VIP 折扣），策略彼此之間互不知道；State 則是物件內部狀態改變時自己切換行為（例如訂單從「待付款」自動流轉到「已出貨」），狀態之間往往知道彼此的存在。

- Template Method（模板方法）：透過繼承來改變演算法的部分步驟（父類別定骨架、子類別填細節）；Strategy 則是透過組合把整個演算法替換掉，靈活性更高。

## 五、運作原理與設計原則剖析

- 開放封閉原則（Open-Closed Principle, OCP）
  這是 Strategy Pattern 最核心的價值。當需要新增「黑五 5 折」活動時，只需新增一個 `BlackFridayDiscount`，完全不需要修改 `ShoppingCart` 的既有程式碼，大幅降低改壞現有功能的風險。
- 單一職責原則（Single Responsibility Principle, SRP）
  `ShoppingCart` 只專注於管理購物車與結帳流程，每種折扣計算邏輯也各自獨立在自己的類別或函式中，不會把所有算式混成一團。
- 合成複用原則（Composition over Inheritance）
  如果用繼承來解決問題（例如寫出 VipShoppingCart、ThresholdShoppingCart），當條件一多（例如「VIP + 滿千折百」）就會引發類別爆炸。Strategy 改用「組合」把行為注入進去，讓擴充變得線性且可控。
- 依賴反轉原則（Dependency Inversion Principle, DIP）
  高階模組（`ShoppingCart`）不依賴低階模組（`VipDiscount`），兩者共同依賴抽象介面（`DiscountStrategy`）。

## 六、常見使用情境與優缺點評估

### 使用情境

- 同一件事有多種演算法或規則：例如不同的排序演算法、檔案壓縮格式（ZIP、RAR、7z）、圖片濾鏡處理。
- 業務規則頻繁變動或依條件切換：例如電商促銷折扣、運費計算（宅配、超商取貨、海外空運）、第三方金流串接（藍新、綠界、Stripe）。
- 想消除肥大的條件判斷式：當程式碼中出現超過 3～4 層的 if/else 或 switch，且每個分支都在做同一類型的運算時，就是重構成 Strategy 的好時機。

### 優缺點評估

- 優點
  - 高擴充性：新增策略不用動到主流程，符合 OCP。
  - 避免多重條件判斷：程式碼更乾淨、好讀，每個策略的邏輯都很短小精悍。
  - 執行時可動態切換：隨時都能抽換行為，不需要重新建立主物件。
- 缺點
  - 呼叫端必須了解策略差異：使用端需要知道有哪些策略可選，以及它們各自適用什麼情境（這點常靠 Factory 或設定檔來緩解）。
  - 物件/檔案數量增加：如果用傳統 OOP 寫法，每多一種策略就多一個類別（在 TS/JS 中改用函式型別可大幅改善）。
  - 過度設計風險：如果只有 2 種固定規則且幾乎不會變動，直接寫簡單的 if/else 反而最直觀，不需要硬套模式。
