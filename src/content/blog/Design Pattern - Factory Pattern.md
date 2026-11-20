---
title: 'Design Pattern - Factory Pattern'
description: '在物件導向開發裡經常用 new 來建立物件。而當系統需要根據條件決定要建立哪一個類別，或建立過程需要帶入設定與依賴時，業務邏輯中到處散落的 new 會讓程式碼與具體類別緊緊綁在一起：每新增一種實作，就得翻遍所有呼叫端修改。'
pubDate: 'April 9 2026'
heroImage: ''
tags: ['Design-Pattern', 'TypeScript', 'OOP']
category: '軟體設計'
---

在物件導向開發裡經常用 `new` 來建立物件。而當系統需要**根據條件決定要建立哪一個類別**，或建立過程需要帶入設定與依賴時，業務邏輯中到處散落的 `new` 會讓程式碼與具體類別緊緊綁在一起：每新增一種實作，就得翻遍所有呼叫端修改。

Factory Pattern（工廠模式）處理的就是這個問題：**把「要建立哪個類別、怎麼建立」集中到一個地方。**

## 一、核心概念

Factory Pattern（工廠模式）是一種建立型（Creational）設計模式，它的核心是：將「物件的建立（Creation）」與「物件的使用（Usage）」徹底解耦。

- 職責分離（Separation of Concerns）：將「物件的建立」與「物件的使用」徹底解耦。呼叫端（Client）只需專注於業務邏輯，不需要關心物件是如何產生的、有哪些複雜的建構步驟或依賴。

- 集中變動點（Encapsulate Variation）：將「要建立哪一個類別」與「帶入哪些參數」的選擇邏輯集中封裝在工廠內部。未來新增或修改產品時，受影響的範圍會從「散落各處的呼叫端」縮減到「工廠內部一處」。

- 依賴抽象（Dependency Inversion）：呼叫端始終依賴抽象介面（如 `NotificationChannel`），而不依賴具體的類別（如 `EmailNotification`）。只有工廠知道具體類別的細節，符合 DIP（依賴反轉原則）。

- 提高可測試性（Testability）：當物件的建立集中於工廠時，測試時能輕鬆透過替換工廠傳入 Fake 或 Mock 物件，大幅降低單元測試的難度與依賴。

## 二、生活例子：餐廳

走進餐廳，你只要點餐，不會自己走進廚房切菜、開火。

- 顧客（Client）：只說要什麼，例如「一份義大利麵」。
- 菜單上的品項（Product 介面）：不論怎麼做，端出來的都是「義大利麵」。
- 廚房（Factory）：決定用什麼食材、怎麼料理。
- 端上桌的那一盤（Concrete Product）：實際做出來的料理。

> 顧客只向廚房要東西，不需要知道怎麼做。程式中也一樣：呼叫端只向工廠要物件，不需要自己 new。

接下來說明三種工廠，會用這家餐廳的不同情境分別解釋。

## 三、三種工廠

### Simple Factory（簡單工廠）

用一個函式依參數決定要建立哪個物件，「選擇 + 建立」都集中在這一處。

- 生活例子：點餐櫃台。顧客在櫃台說「我要牛肉麵」或「我要炒飯」，櫃台看了單子，就交給對應的廚師去做。顧客只要說出菜名，不需要知道是哪位廚師、怎麼做的。
- 特點：重點在集中判斷，所有「要做哪道菜」的決定都在櫃台這一處，最簡單也最常見（不屬於 GoF）。缺點是每新增一道菜，都要修改櫃台的判斷邏輯；菜色一多，判斷式就會越來越長。

### Factory Method（工廠方法）

父類別定義固定流程，把「建立產品」這一步留給子類別決定。

- 生活例子：連鎖餐廳分店。總部規定所有分店的出餐流程都一樣：收單 → 製作主餐 → 擺盤 → 送餐，但主餐由各分店自己決定，台北店做牛肉麵、大阪店做拉麵。新開一家首爾店，只要決定首爾店的主餐，出餐流程直接照用。
- 特點：重點在共用流程，流程只寫一次，每家分店只負責決定自己的主餐，不需要中央櫃台來判斷。缺點是每新增一種產品，就要多一個子類別，就像每多一種主餐就得多開一家分店。如果沒有需要共用的流程，就不需要這個模式。

### Abstract Factory（抽象工廠）

一個介面負責建立一整組彼此搭配的物件，換一個工廠就換掉整組。

- 生活例子：日式廚房與義式廚房。餐廳有日式和義式兩個廚房。選定日式廚房後，主餐、湯、甜點都由它來做，分別是拉麵、味噌湯、抹茶布丁；換成義式廚房，就是義大利麵、南瓜濃湯、提拉米蘇。只要選定一個廚房，就不會出現拉麵配南瓜濃湯的混搭。
- 特點：重點在一致性，使用端只需要選定一個工廠，拿到的物件就一定互相搭配。缺點是要在家族裡新增一種產品時（例如每餐多加一杯飲料），每個廚房都得跟著學會做飲料，也就是每個具體工廠都要修改。

## 四、程式碼實作：通知系統

以「發送通知」為例：系統要能用 Email 或簡訊通知使用者，未來可能再加 LINE。

### 4.1 產品：所有通知管道的共同介面

```ts
// 不命名為 Notification，以免和瀏覽器內建的同名型別衝突
interface NotificationChannel {
  send(message: string): void;
}

class EmailNotification implements NotificationChannel {
  send(message: string): void {
    console.log(`[Email] ${message}`);
  }
}

class SMSNotification implements NotificationChannel {
  send(message: string): void {
    console.log(`[SMS] ${message}`);
  }
}
```

### 4.2 Simple Factory：一個函式負責「選擇 + 建立」

```ts
type Channel = 'email' | 'sms';

function createNotification(channel: Channel): NotificationChannel {
  if (channel === 'email') {
    // 實務上這裡會帶入 SMTP 設定、API key 等，呼叫端都不需要知道
    return new EmailNotification();
  }
  return new SMSNotification();
}
```

使用端只要說「我要哪一種」，不需要知道任何具體類別：

```ts
const notification = createNotification('email');
notification.send('您的驗證碼是 1234');
// [Email] 您的驗證碼是 1234
```

新增 LINE 時，只要改 `createNotification` 這一處，所有呼叫端都不用動。

### 4.3 Factory Method：流程固定，產品由子類別決定

Factory Method 的重點**不在於「用工廠取代 `new`」**，而在於：**父類別有一段共用流程，流程中用到的物件由子類別決定。**

```ts
abstract class Notifier {
  // Factory Method：子類別只需要決定「用哪一種通知」
  protected abstract createNotification(): NotificationChannel;

  // 共用流程：所有通知管道都一樣，子類別不用重寫
  notify(message: string): void {
    const notification = this.createNotification();
    notification.send(`[MyApp] ${message}`); // 統一加上前綴
    console.log('通知已送出'); // 統一記錄
  }
}

class EmailNotifier extends Notifier {
  protected createNotification(): NotificationChannel {
    return new EmailNotification();
  }
}

class SMSNotifier extends Notifier {
  protected createNotification(): NotificationChannel {
    return new SMSNotification();
  }
}
```

業務邏輯只依賴抽象的 `Notifier`，不知道背後是 Email 還是簡訊：

```ts
function sendOtp(notifier: Notifier, code: string): void {
  notifier.notify(`您的驗證碼是 ${code}`);
}

sendOtp(new EmailNotifier(), '1234');
// [Email] [MyApp] 您的驗證碼是 1234
// 通知已送出
```

新增 LINE 時，只要新增 `LineNotification` 和 `LineNotifier`，`notify()` 和 `sendOtp()` 都不用修改。

> **為什麼不直接把 `NotificationChannel` 傳進去就好？** 如果沒有 `notify()` 這類共用流程，直接傳入確實更簡單，這時也不需要 Factory Method。這個模式的價值在於「流程固定、產品可換」：共用流程只寫一次，每種管道只需要決定自己的產品。實務上的共用流程通常更多，例如重試、記錄、格式化。

> **選擇用哪個 Notifier 的邏輯去哪了？** 一定有某個地方要決定建立 `EmailNotifier` 還是 `SMSNotifier`，通常集中在程式的進入點，而且常常就是用一個 Simple Factory 來做。兩者並不衝突：Simple Factory 負責選擇，Factory Method 負責流程。

### 4.4 Abstract Factory：一次建立一整組

當**多個物件必須成套搭配**時使用。

以通知來說，每個管道都需要兩個物件：一個負責排版、一個負責發送。Email 要用 HTML 排版，簡訊要用純文字；如果把 HTML 排版配上簡訊發送，使用者就會收到一堆 `<h1>` 標籤。Abstract Factory 保證這兩個物件一定成套出現。

```ts
interface Formatter {
  format(text: string): string;
}
interface Sender {
  send(content: string): void;
}

// Abstract Factory：一次負責一整組
interface ChannelKit {
  createFormatter(): Formatter;
  createSender(): Sender;
}

class EmailKit implements ChannelKit {
  createFormatter(): Formatter {
    return { format: (text) => `<h1>${text}</h1>` };
  }
  createSender(): Sender {
    return { send: (content) => console.log(`[Email] ${content}`) };
  }
}

class SMSKit implements ChannelKit {
  createFormatter(): Formatter {
    return { format: (text) => text }; // 純文字
  }
  createSender(): Sender {
    return { send: (content) => console.log(`[SMS] ${content}`) };
  }
}
```

使用端只拿到一個 kit，不可能混搭出錯：

```ts
function broadcast(kit: ChannelKit, text: string): void {
  const content = kit.createFormatter().format(text);
  kit.createSender().send(content);
}

broadcast(new EmailKit(), '系統維護通知'); // [Email] <h1>系統維護通知</h1>
broadcast(new SMSKit(), '系統維護通知'); // [SMS] 系統維護通知
```

其他常見例子：

- 跨平台 UI：Windows 版的按鈕、視窗、選單必須是同一套風格。
- 資料庫存取：MySQL 版的連線物件和查詢物件必須搭配使用，不能拿 MySQL 連線去執行 PostgreSQL 的查詢。

### 4.5 更輕量的寫法：用對照表取代 if/else

在 TypeScript 中，工廠不一定要寫成 class 或 `if/else`。一張「名稱 → 建立函式」的對照表也能做到同樣的事：

```ts
const channelFactories: Record<Channel, () => NotificationChannel> = {
  email: () => new EmailNotification(),
  sms: () => new SMSNotification(),
};

const channel = channelFactories['sms']();
channel.send('您的訂單已出貨'); // [SMS] 您的訂單已出貨
```

新增 LINE 時只要在表中加一行。種類變多時，這比一長串 `if/else` 更好讀。

### 4.6 容易混淆的模式

- **Builder**：處理「同一個物件如何一步步組裝出來」（例如有大量選填參數）。Factory 決定的是「要建立哪一個類別」。
- **Template Method**：固定流程中有可替換的步驟。Factory Method 就是「被替換的步驟恰好是建立物件」的 Template Method。
- **Strategy**：在執行時切換不同的行為。Strategy 關注「物件做什麼」，工廠常被用來**產生** Strategy 物件。
- **DI Container**：統一管理整個應用程式的物件建立與注入，可以看成通用化、由框架代管的工廠。

## 五、運作原理與設計原則剖析

- **單一職責原則（Single Responsibility Principle, SRP）**
  「建立哪一個物件、需要哪些設定」的邏輯全部封裝在工廠裡。業務邏輯只負責「使用」物件，不必混雜任何建構細節，職責邊界清晰。
- **開放封閉原則（Open-Closed Principle, OCP）**
  如果未來要新增 LINE 通知，只需要新增 `LineNotification`（以及 Factory Method 的 `LineNotifier`），`sendOtp`、`notify()` 等業務邏輯完全不需要修改。要注意的是，工廠不會讓「選擇」消失：工廠或對照表那一處仍要新增一筆，工廠的貢獻是把修改範圍縮小到這一處。
- **依賴反轉原則（Dependency Inversion Principle, DIP）**
  業務邏輯依賴抽象介面（`NotificationChannel`、`Notifier`），而不依賴具體類別（`EmailNotification`）。只有工廠知道具體類別是誰。
- **可測試性（Testability）**
  物件的建立集中在工廠，測試時只要換一個回傳假物件的工廠，就能在不真的寄信、發簡訊的情況下測試業務邏輯。

## 六、常見使用情境與優缺點評估

### 使用情境

- **依執行時資訊決定實作**：要建立的類別取決於使用者設定、環境變數、feature flag 或請求內容，例如依使用者偏好選擇通知管道。
- **隱藏建構細節**：建立物件需要 API key、連線資訊等設定，而這些細節不該讓呼叫端知道。
- **固定流程搭配可替換的物件**：有一段共用流程，只有流程中使用的物件會變（Factory Method）。
- **成套產品的一致性**：多個物件必須彼此搭配、不能混用，例如跨平台 UI 元件、同一資料庫的連線與查詢物件（Abstract Factory）。

### 優缺點評估

- **優點**
  - **降低耦合**：呼叫端與具體類別解耦，新增實作時業務邏輯不用修改。
  - **建立邏輯集中**：建構細節都在工廠裡，好找、好改，也方便在測試中替換成假物件。
- **缺點**
  - **類別數量增加**：Factory Method 每新增一種產品，就要多一個對應的子類別；在 TypeScript 中可改用對照表減輕。
  - **容易過度設計**：如果只有一種實作、近期也看不到第二種，直接 `new` 就好。工廠在這種情況下只會多一層不必要的抽象，等真的出現第二種實作再抽出來也不遲。
