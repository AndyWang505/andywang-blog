---
title: 'Design Pattern - Observer Pattern'
description: '在系統開發中，經常遇到「一處狀態改變，多處需要跟著反應」的需求。例如使用者完成下單後，系統要同時扣庫存、寄確認信、發送推播通知、還要寫入數據分析紀錄。'
pubDate: 'May 21 2026'
heroImage: ''
tags: ['Design-Pattern', 'TypeScript', 'OOP']
category: '軟體設計'
---

在系統開發中，經常遇到「一處狀態改變，多處需要跟著反應」的需求。例如使用者完成下單後，系統要同時扣庫存、寄確認信、發送推播通知、還要寫入數據分析紀錄。

最直覺的寫法就是在「下單完成」的函式裡，把這四個模組的程式碼全部寫在一起。但只要未來產品經理說「下單後順便發一張折價券」，你就得回去改下單的核心邏輯——核心業務被一堆無關的後續動作綁死，越改越脆弱。

Observer Pattern（觀察者模式）處理的就是這個問題：建立一種「一對多」的訂閱機制，當主題（Subject）狀態改變時，自動通知所有訂閱它的觀察者（Observer），而不需要知道這些觀察者是誰。

## 一、核心概念

Observer Pattern（觀察者模式）是一種行為型（Behavioral）設計模式，它的核心是：定義物件之間一對多的依賴關係，當一個物件的狀態發生改變時，所有依賴於它的物件都會自動收到通知並更新。

- 發布者與訂閱者解耦（Decouple Subject from Observers）：狀態改變的一方（Subject）只負責「廣播消息」，完全不需要知道有哪些具體模組在聽、收到消息後要做什麼。
- 動態增減連動行為（Dynamic Subscription）：觀察者可以在程式執行期間隨時「訂閱（Subscribe）」或「取消訂閱（Unsubscribe）」，不需要修改發布者的程式碼就能掛載新功能。
- 符合開放封閉原則（Open-Closed Principle）：未來每次新增「下單後要做的事」，只要寫一個新的觀察者並註冊上去就好，核心下單流程一行都不用動。
- 避免輪詢浪費（Push over Poll）：觀察者不需要每隔幾秒就主動跑去問「狀態變了沒？」，而是等狀態真的改變時被動接收通知，架構更乾淨也更省資源。

## 二、生活例子：YouTube 頻道訂閱

假設你很喜歡某位科技 YouTuber，每次他發新片你都想第一時間看到：

- 發布者（Subject / Publisher）：YouTube 頻道主。他只專心拍片、按下「發布」，不需要親自記住每位觀眾的 Email 或手機號碼。
- 訂閱者名單（Subscribers List）：頻道後台維護的一份名單，記錄目前有哪些人按了「訂閱 + 小鈴鐺」。
- 觀察者（Observer / Subscriber）：你、我、以及其他所有觀眾。
  - 觀眾 A（你）：收到通知後，立刻點開影片配飯吃。
  - 觀眾 B（競爭對手）：收到通知後，跑去分析這支片的標題與流量。
  - 觀眾 C（剪輯師）：收到通知後，把影片存進靈感資料夾。

> 頻道主按下發布鍵的瞬間，系統會自動通知名單上的所有人；至於每個人收到通知後要怎麼反應，頻道主完全管不著、也不需要知道。不想看了？隨時按「取消訂閱」就好。

## 三、Observer Pattern 的四個角色

Observer Pattern 的結構很清晰，主要由四個角色組成：

1. Subject（主題 / 發布者介面）
   定義管理觀察者的基本操作，通常包含 `subscribe`（訂閱）、`unsubscribe`（取消訂閱）與 `notify`（通知所有觀察者）。

2. Concrete Subject（具體主題）
   實際擁有核心狀態的物件。它內部維護一份觀察者清單，當自身狀態改變時，呼叫 `notify()` 把最新資訊廣播出去。

3. Observer（觀察者介面）
   定義所有觀察者必須實作的更新介面（通常是一個 `update()` 方法），讓發布者可以用統一的方式通知所有人。

4. Concrete Observer（具體觀察者）
   實作 Observer 介面的具體類別，各自封裝「收到通知後要執行的業務邏輯」。

## 四、程式碼實作：電商訂單狀態通知系統

以「電商訂單」為例：當一筆訂單的狀態變成 PAID（已付款）時，系統需要同步觸發「發送收據 Email」、「通知倉庫出貨」與「累積會員點數」。

### 4.1 壞味道：把所有後續動作寫死在核心流程

沒有使用 Observer Pattern 之前，訂單類別通常會長成這樣：

```ts
class OrderService {
  payOrder(orderId: string, amount: number): void {
    // 1. 核心業務：更新訂單狀態
    console.log(`訂單 ${orderId} 付款成功，金額 $${amount}`);

    // 2. 緊密耦合的後續動作：每多一個需求就要來改這裡
    emailService.sendReceipt(orderId);
    warehouseService.prepareShipment(orderId);
    loyaltyService.addPoints(orderId, amount);
  }
}
```

這樣的寫法讓 `OrderService` 必須認識所有下游服務。只要寄信或點數系統的介面改了，甚至只是測試時不想真的寄信，都會直接卡死在 `OrderService` 裡。

### 4.2 重構：套用 Observer Pattern

我們把「訂單付款後的連動行為」抽成觀察者介面，讓 Order 只負責管理訂閱者與發送通知：

```ts
// 定義事件傳遞的資料結構
interface OrderEvent {
  orderId: string;
  amount: number;
  status: 'PAID' | 'CANCELLED';
}

// 1. Observer 介面：所有訂閱者都實作同一個接收方法
interface OrderObserver {
  update(event: OrderEvent): void;
}

// 2. Concrete Subject：訂單本身只維護訂閱名單，不認識具體服務
class Order {
  private observers: OrderObserver[] = [];

  subscribe(observer: OrderObserver): void {
    this.observers.push(observer);
  }

  unsubscribe(observer: OrderObserver): void {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  private notify(event: OrderEvent): void {
    for (const observer of this.observers) {
      observer.update(event);
    }
  }

  // 核心業務：狀態改變時廣播通知
  pay(orderId: string, amount: number): void {
    console.log(`訂單 ${orderId} 付款成功，金額 $${amount}`);
    this.notify({ orderId, amount, status: 'PAID' });
  }
}
```

接著把原本塞在核心流程裡的後續動作，拆成各自獨立的 Concrete Observer：

```ts
// 3. Concrete Observers：各自處理自己的職責
class EmailReceiptObserver implements OrderObserver {
  update(event: OrderEvent): void {
    if (event.status === 'PAID') {
      console.log(`[Email] 已寄送訂單 ${event.orderId} 的電子收據`);
    }
  }
}

class WarehouseObserver implements OrderObserver {
  update(event: OrderEvent): void {
    if (event.status === 'PAID') {
      console.log(`[倉庫] 收到訂單 ${event.orderId}，開始揀貨打包`);
    }
  }
}

class LoyaltyPointObserver implements OrderObserver {
  update(event: OrderEvent): void {
    if (event.status === 'PAID') {
      const points = Math.floor(event.amount / 10);
      console.log(`[點數] 訂單 ${event.orderId} 已入帳 ${points} 點`);
    }
  }
}
```

使用端在組裝時把需要的觀察者掛上去，甚至可以在執行期間動態拔除：

```ts
const order = new Order();
const emailObserver = new EmailReceiptObserver();
const warehouseObserver = new WarehouseObserver();
const loyaltyObserver = new LoyaltyPointObserver();

// 註冊訂閱者
order.subscribe(emailObserver);
order.subscribe(warehouseObserver);
order.subscribe(loyaltyObserver);

order.pay('ORD-2026001', 1500);
// 訂單 ORD-2026001 付款成功，金額 $1500
// [Email] 已寄送訂單 ORD-2026001 的電子收據
// [倉庫] 收到訂單 ORD-2026001，開始揀貨打包
// [點數] 訂單 ORD-2026001 已入帳 150 點

// 假設系統維護暫停點數活動，隨時取消訂閱即可
order.unsubscribe(loyaltyObserver);
```

> 推模式（Push）vs. 拉模式（Pull）： 上面的範例把整包 `OrderEvent` 直接塞給觀察者，這叫「推模式」；另一種做法是只傳 order 實例本身，讓觀察者自己去呼叫 `order.getAmount()` 拿需要的資料，這叫「拉模式」。實務上推模式（傳遞唯讀的 Event 物件）更安全，能避免觀察者意外修改到 Subject 的內部狀態。

> 別忘了取消訂閱（Memory Leak 陷阱）： 如果 Subject 的生命週期很長（例如全域的訂單中心），而某個短命的 Observer 訂閱後卻在銷毀前忘記呼叫 `unsubscribe()`，Subject 就會一直抓著它的參考不放，導致記憶體洩漏（Memory Leak）。

### 4.3 容易混淆的模式

- Pub/Sub（發布/訂閱模式）：常被當作 Observer Pattern 的別名，但在架構層面上有細微差異。Observer 模式中，Subject 與 Observer 彼此有直接參考（`order.subscribe(observer)`）；而 Pub/Sub 會在中間多一層事件通道（Message Broker / Event Bus），發布者與訂閱者完全不知道對方的存在。

- Mediator（中介者模式）：多個物件之間有複雜的網狀互動時，引入一個「中介者」集中協調所有溝通邏輯（例如塔台協調多架飛機）；Observer 則是單向的「一對多廣播」，觀察者只被動接收消息。

- Chain of Responsibility（責任鏈模式）：同樣把請求傳給多個物件，但責任鏈是「接力賽」，請求沿著鏈條一個一個傳下去，直到有人處理為止；Observer 則是「大聲公」，所有訂閱者同時收到同一份通知。

## 五、運作原理與設計原則剖析

- 開放封閉原則（Open-Closed Principle, OCP）
  當系統需要新增「下單後發送 Slack 通知給業務團隊」時，只需要新增一個觀察者並訂閱事件，原本的 Order 類別完全不用修改，真正做到對擴充開放、對修改關閉。

- 單一職責原則（Single Responsibility Principle, SRP）
  Order 只專注在處理訂單狀態轉換；寄信、扣庫存、算點數各自拆成獨立模組，不會全部混在同一個函式裡。

- 依賴反轉原則（Dependency Inversion Principle, DIP）
  高階的核心業務（Order）不依賴低階的基礎設施（`EmailService`、`WarehouseService`），而是透過抽象的 `OrderObserver` 介面（或事件契約）進行溝通，反轉了原本核心依賴周邊服務的糟糕結構。

## 六、常見使用情境與優缺點評估

### 使用情境

- 事件驅動的業務流程：電商下單後觸發寄信、扣庫存、發點數；使用者註冊後發送歡迎信與初始化設定。
- UI 介面與資料同步：前端框架（如 React 的狀態管理、RxJS、DOM 的 `addEventListener`）的核心機制，當底層資料模型改變時，自動更新所有綁定的畫面元件。
- 跨模組解耦：兩個模組需要連動，但你不希望在程式碼層面上讓它們互相 import 造成循環依賴（Circular Dependency）。

### 優缺點評估

- 優點
  - 徹底解耦發布者與訂閱者：核心業務不用被周邊副作用綁架，程式碼乾淨好維護。
  - 支援執行時動態建立關聯：隨時可以掛載或卸載監聽邏輯，非常適合插件化（Plugin）架構。
- 缺點
  - 執行順序不可控且除錯較難：當多個觀察者同時監聽同一個事件時，它們的執行順序通常不該被依賴；而且事件跳轉會讓程式的呼叫堆疊（Call Stack）變得不直觀，出錯時追蹤起來比直接呼叫函式更花時間。
  - 連鎖反應風險：如果觀察者 A 收到通知後又改了某個狀態、觸發觀察者 B，一路連鎖下去容易形成難以預測的循環觸發（Infinite Loop）。
  - 潛在的記憶體洩漏：忘記解除不再使用的訂閱，會導致物件無法被垃圾回收（GC）。
