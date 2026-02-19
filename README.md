# 🤖 JARVIS

> **A production-grade, multi-domain Telegram bot that fuses real-time financial intelligence, AI-powered lifestyle curation, and personal productivity tools into a single, always-on assistant.**
> Built with a strict command-handler architecture on TypeScript and Bun, Jarvis delivers broker-grade paper trading, market alerts, AI vibe profiling, anime discovery, expense tracking, and much more — all from a Telegram chat.

![Version](https://img.shields.io/badge/version-2.39.0-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6?style=flat-square&logo=typescript&logoColor=blue)
![Bun](https://img.shields.io/badge/Bun-runtime-fbf0df?style=flat-square&logo=bun&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-ES2022-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-1.41.0-4285F4?style=flat-square&logo=google&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-red?style=flat-square)

---

## 🎯 Project Overview

Jarvis is a fully-featured, production-ready Telegram bot written in TypeScript. It acts as a personal assistant blending three major domains: **financial analytics & paper trading** (stocks, crypto, forex via CCXT + Yahoo Finance), **AI-powered lifestyle services** (weather-aware vibe profiles, moodboard generation, urban exploration, brainstorming via Google Gemini), and **personal productivity** (reminders, expense tracking, news, anime, lyrics, and media downloads). Every component is modelled as a strict interface — `Command`, `MessageHandler`, or `CallbackHandler` — making the architecture infinitely extensible without touching core dispatch logic.

**Perfect for:**

- Developers who want a battle-tested Telegram bot scaffold with real service integrations
- Traders who need a private, chat-native paper trading terminal and price alert system
- Individuals seeking an all-in-one personal assistant with AI-powered daily vibe, prayer times, and news
- Teams running on Railway / Nixpacks who need a zero-config cloud-deployable bot
- Anyone learning production TypeScript patterns: circuit breakers, session management, DI, and CRON scheduling

---

## ✨ Core Features

### 💹 Financial Suite

- **Paper Trading Engine**: Full buy/sell/close lifecycle with commission simulation (`COMMISSION_RATE: 0.001`) and average-price position averaging via `TradingEngine`
- **Real-Time Price Feed**: Auto-routes `ccxt` (Binance) for crypto, `yahoo-finance2` for stocks & forex; 30-second TTL cache prevents API hammering
- **Price Alerts**: Set `>`, `<`, `>=`, `<=` triggers; `AlertScheduler` polls every minute via `node-cron` and fires push notifications
- **Arbitrage Monitor**: Continuously scans exchange spread opportunities above a configurable 1.5% threshold
- **TP/SL Management**: Interactive take-profit and stop-loss wiring per position with inline keyboard callbacks
- **Risk Calculator**: Position-sizing wizard (capital → risk% → stop-loss pips → recommended lot size)
- **Market Hub**: Multi-tab inline keyboard blending live price, chart, sentiment, and alert setup into one message
- **Economic Calendar**: Forex Factory feed parsed by `EconomicCalendarService`; high-impact event subscriptions

### 🧠 AI & Lifestyle

- **Vibe Profiling**: Combines real-time weather + geolocation + Gemini to return a mood, music recommendation, perfume suggestion, and Instagram caption via `VibeService`
- **Aesthetic Moodboard**: AI-curated aesthetic theme with palette, visual style, and reference images via `AestheticService`
- **Urban Hunt**: Explores hidden local spots using Nominatim geocoding + Gemini via `UrbanExplorationService`
- **Brainstorm Engine**: `/brainstorm`, `/idea`, and `/lore` commands powered by `BrainstormService` (Google Gemini)
- **AI Chat Mode**: Toggle conversational Gemini sessions per-chat with `/aichat`/`/stopchat`
- **Circuit Breaker**: `GenAIService` implements a 3-failure / 30-second reset circuit breaker pattern for Gemini reliability

### 📱 Entertainment & Discovery

- **Anime Search**: Jikan API v4 via `@mateoaranda/jikanjs`; multi-result selection with inline keyboard
- **Movie Discovery**: TMDB API with poster image download and metadata summary
- **Lyrics Finder**: Full synced lyrics via `lrclib.net`
- **GeoGuessr Game**: Stateful location guessing game with multi-round sessions
- **Quote of the Day**: FavQs API integration
- **Sticker Creator**: Renders custom text to 512×512 Telegram stickers using `canvas` + `sharp` with rate limiting

### 📰 Information & Utilities

- **Weather**: BMKG (Indonesian meteorology) + Open-Meteo API via `WeatherService`; location-aware via Nominatim reverse geocoding
- **Prayer Times**: Aladhan API for full daily prayer schedule
- **News**: GNews RSS feed parsed with `rss-parser`
- **Earthquake Monitor**: BMKG TEWS real-time earthquake data
- **Media Downloader**: YouTube, TikTok, Instagram, Twitter via `youtube-dl-exec` + Cobalt API; format selection (video/audio) via session wizard

### 🗃️ Productivity

- **Expense Tracker**: `/catat`, `/laporan`, `/rekap` for income/expense logging with category breakdown; persisted in `lowdb` JSON store
- **Smart Reminders**: Natural-language time parsing stored in DB; `node-cron` fires Telegram pushes at exact times
- **Smart Paste**: Auto-detects URLs (+media platform) from pasted text and proposes download action
- **Session Manager**: Multi-type typed session state (`ExpenseSession`, `TradeSession`, `RiskSession`, etc.) persisted across bot restarts

---

## 🛠️ Technology Stack

### Runtime & Language

- **TypeScript 5.9.3**: Strict mode, `noUnusedLocals`, `noImplicitReturns` — zero type-level compromises
- **Bun (latest)**: Development runtime with `--watch` hot-reload; also used for install and CI builds
- **Node.js (ES2022)**: Production runtime target for `node dist/index.js`

### Bot & Web Framework

- **node-telegram-bot-api 0.66.0**: Core polling-based Telegram client; long-polling with 10s timeout
- **Express 5.2.1**: Minimal HTTP server exposing a `/` health-check endpoint for uptime monitors

### AI & Data

- **@google/genai 1.41.0**: Google Gemini API — vibe profiling, brainstorming, caption generation
- **ccxt 4.5.38**: Multi-exchange crypto data (Binance primary); price feeds and arbitrage scanning
- **yahoo-finance2 3.13.0**: Stocks, ETFs, and forex pair pricing
- **axios 1.13.5**: HTTP client for all REST API calls (weather, prayer, news, TMDB, etc.)
- **rss-parser 3.13.0**: GNews and economic calendar feed parsing

### Charting & Media

- **chart.js 4.5.1 + chartjs-node-canvas 5.0.0**: Server-side chart rendering to PNG buffer
- **chartjs-chart-financial 0.2.1**: Candlestick and OHLC chart types
- **canvas 3.2.1**: Node.js Canvas API for sticker text rendering
- **sharp 0.34.5**: High-performance image resizing and WebP/PNG conversion
- **youtube-dl-exec 3.1.1**: Media downloading (YouTube, TikTok, Instagram, Twitter)

### Database & Scheduling

- **lowdb 7.0.1**: Zero-config JSON file database; schema-typed with `DatabaseSchema` interface
- **node-cron 3.0.3**: Cron-based job scheduling for reminders, price alerts, arbitrage, and calendar notifications
- **date-fns 4.1.0**: Date parsing, formatting, and manipulation utilities

### Anime & Entertainment

- **@mateoaranda/jikanjs 1.3.1**: Jikan (MyAnimeList) API v4 client for anime search

### Developer Tools

- **ESLint 9.39.2**: Flat config linting
- **@typescript-eslint/parser & plugin 8.56.0**: TypeScript-aware linting rules
- **dotenv 16.6.1**: Environment variable loading
- **Nixpacks**: Declarative cloud build config (Railway-compatible)

---

## 🚀 Getting Started

### Prerequisites

- **[Bun](https://bun.sh/) >= 1.3.0** (development) / **[Node.js](https://nodejs.org/) >= 22** (production)
- Python 3 (required by `canvas` native module — included in Nixpacks)
- A Telegram Bot token from [@BotFather](https://t.me/BotFather)
- **~300MB** disk space (287MB node_modules + 1.7MB dist + 584KB source)

### Quick Start (60 seconds)

```bash
git clone https://github.com/Jars44/telegram-bot.git
cd telegram-bot

# Copy environment template and fill in your keys
cp .env.example .env

# Install dependencies (Bun recommended)
bun install

# Start in development mode (hot-reload enabled)
bun run dev
```

Open **[http://localhost:3000]** in your browser to verify the Express health-check endpoint is responding. Then message your bot on Telegram to begin.

### Available Commands

```bash
# Development — hot-reload via Bun watch
bun run dev

# Type-check and compile to dist/
bun run build      # runs: tsc

# Production start (after build)
bun run start      # runs: node dist/index.js

# Lint all TypeScript source files
bun run lint       # runs: eslint src/**/*.ts
```

### Environment Variables

Create a `.env` file in the project root:

| Variable         | Type     | Required | Description                              |
| ---------------- | -------- | -------- | ---------------------------------------- |
| `BOT_TOKEN`      | `string` | ✅       | Telegram Bot API token from BotFather    |
| `GEMINI_API_KEY` | `string` | ✅       | Google AI Studio API key for Gemini      |
| `GNEWS_API_KEY`  | `string` | ✅       | GNews.io API key for news feed           |
| `TMDB_API_KEY`   | `string` | ✅       | The Movie Database API key               |
| `PORT`           | `number` | ❌       | HTTP health-check port (default: `3000`) |

---

## 📁 Project Architecture

```text
jarvis/
├── src/
│   ├── index.ts                  # Entry point: DI wiring, bot init, handler registration
│   ├── commands/                 # Command & handler classes (one-file-per-feature)
│   │   ├── types.ts              # Command / MessageHandler / CallbackHandler interfaces
│   │   ├── TradeCommand.ts       # Portfolio, Buy, Sell, Close, TradeConfirm
│   │   ├── AlertCommand.ts       # Price alert CRUD
│   │   ├── MarketCommand.ts      # Market Hub (price + chart + sentiment)
│   │   ├── ExpenseCommand.ts     # Expense tracking wizard
│   │   ├── VibeCommand.ts        # AI vibe profile
│   │   ├── AestheticCommand.ts   # AI moodboard
│   │   ├── BrainstormCommand.ts  # Idea / Lore / Brainstorm commands
│   │   ├── DownloadCommand.ts    # Media download wizard
│   │   ├── SessionInputHandler.ts# Unified multi-session text input router
│   │   └── ...                   # 30+ additional command files
│   ├── services/                 # Pure business-logic services (no bot coupling)
│   │   ├── GenAIService.ts       # Google Gemini wrapper + circuit breaker
│   │   ├── TradingEngine.ts      # Paper trading: buy/sell/PnL/portfolio
│   │   ├── FinanceDataService.ts # Price fetching: crypto (CCXT) + stocks/forex (Yahoo)
│   │   ├── AlertScheduler.ts     # node-cron jobs: price, arbitrage, calendar, positions
│   │   ├── ChartService.ts       # Chart.js server-side PNG generation
│   │   ├── VibeService.ts        # Weather + AI → vibe profile
│   │   ├── AestheticService.ts   # AI moodboard curation
│   │   ├── UrbanExplorationService.ts # Geocoding + AI → local spot discovery
│   │   └── ...                   # 15+ additional service files
│   ├── database/
│   │   ├── JsonDb.ts             # lowdb adapter: full CRUD for all entities
│   │   └── types.ts              # Schema: Reminder, Transaction, Portfolio, PriceAlert...
│   ├── utils/
│   │   ├── commandHandler.ts     # executeWithLoading / callbackWithLoading helpers
│   │   ├── SessionManager.ts     # Typed per-chat session state with DB persistence
│   │   ├── ResponseBuilder.ts    # Markdown message construction utilities
│   │   ├── uiHelper.ts           # safeEditMessage, inline keyboard builders
│   │   ├── errorHandler.ts       # Global uncaughtException / unhandledRejection setup
│   │   ├── sanitize.ts           # Input sanitization helpers
│   │   └── helpers.ts            # Country flags, formatters, misc utilities
│   ├── config/
│   │   ├── index.ts              # CONFIG constants + getEnvVar + ENV_KEYS
│   │   ├── messages.ts           # Localised message templates
│   │   └── symbols.ts            # Emoji symbol constants (S.LOADING, S.FAIL, etc.)
│   └── types/
│       └── jikanjs.d.ts          # Type declarations for jikanjs module
├── data/
│   └── db.json                   # Live JSON database (reminders, portfolios, alerts)
├── temp/                         # Ephemeral download files (auto-purged by TempCleanerService)
├── assets/                       # Static assets (fonts, images)
├── dist/                         # Compiled JavaScript output (tsc)
├── nixpacks.toml                 # Railway/Nixpacks deployment config
├── tsconfig.json                 # Strict TypeScript config (ES2022 NodeNext)
├── eslint.config.js              # ESLint 9 flat config
└── package.json
```

### Key Design Decisions

- **Separation of Concerns**: Every `Command` file handles only Telegram I/O; all business logic lives in `services/` — commands have zero API calls
- **Interface-Driven Dispatch**: `Command`, `MessageHandler`, and `CallbackHandler` interfaces allow the main loop to treat all handlers uniformly; adding a new feature requires only creating the file and appending to an array
- **Dependency Injection at Boot**: All services are instantiated once in `main()` and passed by reference — no singletons, no global state (except `sessionManager`)
- **Typed Session State**: `SessionManager` stores per-chat typed session objects (`BuyWizardSessionData`, `RiskSessionData`, etc.) enabling complex multi-step wizards without message state tracking
- **Prefix-Based Callback Routing**: Each `CallbackHandler` declares a `prefix` string; the dispatcher routes `callback_query` events in O(n) without regex — fast and explicit
- **Ephemeral Temp Files**: `TempCleanerService` auto-purges `temp/` files older than 1 hour, preventing unbounded disk growth on media download operations

---

## 🎭 How It Works: The Complete Pipeline

### 1️⃣ Message Dispatch Pipeline

```text
Telegram Update (polling)
        ↓
  bot.on("message")
        ↓
  ┌─────────────────────────────┐
  │  Is it a /command?          │
  ├─→ YES: Match against        │
  │        commands[] array     │
  │        (RegExp.exec)        │
  │        → command.execute()  │
  ├─→ NO:  Iterate              │
  │        messageHandlers[]    │
  │        handler.shouldHandle │
  │        → handler.handle()   │
  └─────────────────────────────┘
        ↓
  bot.on("callback_query")
        ↓
  data.startsWith(handler.prefix)
        ↓
  → callbackHandler.handle()
```

### 2️⃣ Financial Data Pipeline

```text
User: /market BTC
        ↓
  MarketCommand.execute()
        ↓
  TradingEngine.getPrice("BTC")
        ↓
  FinanceDataService.getPrice()
        ├─→ isCrypto? → ccxt.binance.fetchTicker("BTC/USDT")
        └─→ isForex? / isStock? → yahoo-finance2.quote(symbol)
        ↓
  30-second priceCache TTL check
        ↓
  ResponseBuilder formats message
        ↓
  InlineKeyboard: [Chart] [Sentiment] [Set Alert] [Risk]
        ↓
  MarketCallbackHandler routes each tab press
        ├─→ "chart_" → ChartService.generateCandlestick() → PNG buffer
        ├─→ "sentiment_" → SentimentAnalyzer.analyze() → Gemini summary
        └─→ "alert_" → AlertScheduler.addAlert() → DB persist
```

### 3️⃣ AI Vibe Pipeline

```text
User: /vibe  (or shares location)
        ↓
  VibeCommand.execute()
        ↓
  WeatherService.getWeather(lat, lon)   ← Open-Meteo API
        ↓
  WeatherCondition classification
  (rain | clear_day | clear_night | cloudy | hot | cold | windy)
        ↓
  AIService.generate(vibePrompt)        ← Google Gemini
        ├─→ Circuit CLOSED? → API call → VibeProfile JSON
        └─→ Circuit OPEN?   → FALLBACK_VIBES Map (hardcoded fallbacks)
        ↓
  VibeService.formatResponse()
        ↓
  Telegram: mood + music + perfume + caption card
```

**Key Optimization**: The `FinanceDataService` maintains a `Map<symbol, {price, timestamp}>` cache with a 30-second TTL. When multiple users request the same symbol within the window, only one upstream API call is made — critical for staying within Binance rate limits during market volatility when alert polling and user requests overlap simultaneously.

---

## 🎨 Technical Deep-Dive

### Circuit Breaker on Google Gemini

```typescript
// src/services/GenAIService.ts
type CircuitState = "closed" | "open" | "half-open";

async generate(prompt: string, temperature = 0.9, maxTokens = 1024): Promise<string> {
  this.checkCircuit(); // throws AIServiceUnavailableError if OPEN

  try {
    const result = await this.executeWithTimeout(prompt, temperature, maxTokens);
    this.onSuccess(); // reset failureCount, set state = "closed"
    return result;
  } catch (error: unknown) {
    this.onFailure(); // increment failures; if >= 3 → state = "open", record timestamp
    throw new AIServiceUnavailableError(message);
  }
}

private checkCircuit(): void {
  if (this.circuitState === "open") {
    const elapsed = Date.now() - this.lastFailureTime;
    if (elapsed >= this.config.resetTimeoutMs) {
      this.circuitState = "half-open"; // allow one probe request
    } else {
      throw new AIServiceUnavailableError("Circuit breaker is OPEN");
    }
  }
}
```

**Result**: After 3 consecutive Gemini failures the circuit opens for 30 seconds, instantly returning an error to the user without waiting for the API timeout — preventing request pile-up and keeping the bot responsive during Gemini outages.

### Paper Trading Average-Price Averaging

```typescript
// src/services/TradingEngine.ts
if (existingPosition) {
  const totalQuantity = existingPosition.quantity + quantity;
  const totalCostBasis = existingPosition.entryPrice * existingPosition.quantity + price * quantity;
  const averagePrice = totalCostBasis / totalQuantity;

  existingPosition.quantity = totalQuantity;
  existingPosition.entryPrice = averagePrice; // weighted average entry
  portfolio.cashBalance -= totalCost;
  await this.db.updatePortfolio(chatId, { cashBalance: portfolio.cashBalance, positions });
}
```

**Result**: Dollar-cost-averaging semantics are preserved automatically — adding to an existing position updates the entry price to the volume-weighted average, ensuring PnL calculations remain accurate across any number of buys on the same symbol.

---

## 🗄️ Database Schema

| Collection           | Key Fields                                                               | Description                             |
| -------------------- | ------------------------------------------------------------------------ | --------------------------------------- |
| `reminders`          | `id`, `chatId`, `time`, `message`, `createdAt`                           | Scheduled cron-fired push notifications |
| `transactions`       | `id`, `chatId`, `type`, `amount`, `description`, `category`, `createdAt` | Expense/income log entries              |
| `portfolios`         | `chatId`, `cashBalance`, `positions[]`, `tradeHistory[]`                 | Per-user paper trading portfolio        |
| `positions`          | `id`, `symbol`, `entryPrice`, `quantity`, `takeProfit`, `stopLoss`       | Open trading positions                  |
| `alerts`             | `id`, `chatId`, `symbol`, `condition`, `targetPrice`, `triggered`        | Price alert rules                       |
| `conversationStates` | `chatId`, `state`, `data`                                                | Persisted multi-step session state      |
| `rateLimits`         | `userId`, `stickerCount`, `lastReset`                                    | Per-user sticker generation rate limits |

---

## 🎯 Performance Optimizations

1. **Price Cache with TTL**: `FinanceDataService` caches every fetched price for 30 seconds in a `Map`. Concurrent `/market`, `/alert` polling, and `/portfolio` PnL updates for the same symbol share a single upstream call.
2. **Circuit Breaker on AI**: `GenAIService` opens the circuit after 3 failures and rejects calls instantly for 30 seconds — no timeout accumulation, no thread blocking during Gemini degradation.
3. **Prefix-Keyed Callback Dispatch**: Callback queries are routed by `data.startsWith(prefix)` — O(n) string scan with early return, never needing regex compilation on hot paths.
4. **Ephemeral File Cleanup**: `TempCleanerService` runs a periodic sweep removing files older than 1 hour, preventing download operations from filling disk on long-running deployments.
5. **Session Persistence**: `SessionManager` persists wizard state to `lowdb` so in-progress multi-step flows (buy wizard, risk calculator) survive pod restarts on Railway — zero user friction on redeploys.

---

## 🎬 Usage

1. **Start the bot** — Send `/menu` to open the main navigation inline keyboard. Navigate to Finance, Lifestyle, or Info domains directly.
2. **Trade & Monitor** — Use `/buy BTC 0.01` to open a paper position, `/market ETH` to view live price with charts, and `/alert` to set a price trigger. Your portfolio persists across sessions via `/portfolio`.
3. **Get a Vibe** — Share your location or use `/vibe` to receive an AI-generated mood profile with music, perfume, and caption tailored to current weather conditions.
4. **Track Expenses** — Type `/catat` and follow the session wizard to log income or expenses by category. Use `/rekap` for a monthly summary and `/laporan` for a full transaction report.
   - Sub-categories are suggested automatically based on your description history.
5. **Download Media** — Send `/download`, paste a YouTube/TikTok/Instagram URL when prompted, and choose video or audio format. Files are delivered directly in chat and auto-cleaned from server disk within 1 hour.

---

## 🌈 Configuration & Compatibility

### Key Configuration Constants

| Constant                         | Value     | Usage                                      |
| -------------------------------- | --------- | ------------------------------------------ |
| `STICKER_LIMIT`                  | `5`       | Max stickers per user per 10-minute window |
| `RATE_LIMIT_RESET_MS`            | `600000`  | Sticker rate-limit cooldown (10 min)       |
| `TEMP_FILE_MAX_AGE_MS`           | `3600000` | Download file TTL before auto-purge (1 hr) |
| `PAPER_TRADING.INITIAL_BALANCE`  | `$10,000` | Starting cash for new paper portfolios     |
| `PAPER_TRADING.COMMISSION_RATE`  | `0.1%`    | Simulated broker commission per trade      |
| `ALERTS.ARBITRAGE_THRESHOLD_PCT` | `1.5%`    | Min spread to trigger arbitrage alert      |
| `HTTP_TIMEOUT_MS`                | `30000`   | Axios request timeout (30s)                |

### Supported Asset Classes

- **Crypto**: BTC, ETH, BNB, XRP, ADA, SOL, DOGE, DOT, MATIC, SHIB, AVAX, LINK, LTC, UNI, ATOM, XMR, ETC, BCH, FIL, APT (via Binance/CCXT)
- **Forex Pairs**: EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD, XAUUSD, XAGUSD, GBPJPY, EURJPY, AUDJPY (via Yahoo Finance)
- **Stocks & ETFs**: Any valid Yahoo Finance ticker symbol

### Environment & Platform Support

| Environment        | Support | Notes                                                   |
| ------------------ | ------- | ------------------------------------------------------- |
| Railway (Nixpacks) | ✅      | `nixpacks.toml` configures Python 3 + Bun automatically |
| Docker             | ✅      | Requires `python3`, `make`, `g++` in base image         |
| Node.js 18+        | ✅      | ES2022 module target                                    |
| Node.js < 18       | ❌      | Not supported; requires ESM `--experimental-modules`    |

---

## 🎓 Learning Resources

### Foundation

1. [node-telegram-bot-api Documentation](https://github.com/yagop/node-telegram-bot-api)
2. [TypeScript Handbook — Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
3. [lowdb — Tiny JSON Database](https://github.com/typicode/lowdb)
4. [node-cron — Task Scheduling](https://github.com/node-cron/node-cron)

### Advanced

1. [CCXT Documentation — Exchange Integrations](https://docs.ccxt.com/)
2. [Google Gemini API — Node.js SDK](https://ai.google.dev/gemini-api/docs)
3. [Chart.js Node Canvas — Server-Side Rendering](https://github.com/SeanSobey/ChartjsNodeCanvas)
4. [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

### Inspiration

1. [Telegram Bot API — Official Docs](https://core.telegram.org/bots/api)
2. [yahoo-finance2 API Reference](https://github.com/gadicc/node-yahoo-finance2)
3. [Nixpacks — Deployment Config](https://nixpacks.com/docs/configuration/file)

---

## 📋 Code Quality & Maintenance

### Code Standards

- ✅ **TypeScript Strict Mode**: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`
- ✅ **ESLint**: Flat config with `@typescript-eslint` plugin v8 — enforced on all `src/**/*.ts`
- ✅ **ES Modules**: `"type": "module"` with `NodeNext` resolution — no CommonJS leakage
- ✅ **Interface-First Design**: All cross-module contracts defined as TypeScript interfaces in `types.ts` files
- ✅ **Source Maps**: Enabled in `tsconfig.json` for debuggable production stack traces
- ✅ **Declaration Maps**: `.d.ts` output for all compiled modules

### Testing

```bash
# No test runner is currently configured.
# To add Bun's built-in test runner:
bun add -d @types/bun

# Create test files alongside source:
# src/services/__tests__/TradingEngine.test.ts

# Run tests:
bun test
```

---

## 🚀 Future Roadmap

### Version 2.5

- [ ] **Test Suite**: Bun test coverage for `TradingEngine`, `FinanceDataService`, and `AlertScheduler`
- [ ] **Short Selling**: Implement `short`/`cover` commands in `TradingEngine` for bearish paper positions
- [ ] **Portfolio Analytics**: Sharpe ratio, max drawdown, and win-rate statistics in `/portfolio`
- [ ] **Multi-Language Support**: i18n layer for English + Indonesian message templates

### Version 3.0

- [ ] **PostgreSQL Adapter**: Replace `lowdb` with a `pg` adapter implementing the same `JsonDb` interface for horizontal scaling
- [ ] **Webhook Mode**: Replace long-polling with Express webhook endpoint + bot.processUpdate for lower latency
- [ ] **Plugin System**: Dynamic command registration from external modules without touching `index.ts`
- [ ] **Web Dashboard**: Express-powered admin UI for portfolio overview and alert management
- [ ] **Voice Messages**: Gemini multimodal transcription + intent routing for voice command support

---

## 🤝 Contributing

1. **Fork** the repository on GitHub
2. **Create** a feature branch: `git checkout -b feature/my-new-command`
3. **Commit** your changes: `git commit -m "feat: add /mycommand with XService integration"`
4. **Push** to the branch: `git push origin feature/my-new-command`
5. **Open** a Pull Request describing what command/service was added and why

### Development Guidelines

- Each new feature requires a `Command` (or `MessageHandler`) file in `src/commands/` and a corresponding `Service` in `src/services/`
- Services must not import from `commands/` — the dependency graph is strictly one-directional
- All new environment variables must be registered in `ENV_KEYS` in `src/config/index.ts`
- Inline keyboard callbacks must declare a unique `prefix` string and be registered in the `callbackHandlers` array
- Run `bun run lint` and `bun run build` before submitting — no lint errors, no type errors

---

## 📄 License

This project is licensed under the **MIT License**.

You're free to use this code for:

- ✅ Personal Telegram bots and automation projects
- ✅ Learning TypeScript architecture patterns and service design
- ✅ Forking and building commercial bots (with attribution)
- ✅ Adapting the trading engine for paper trading simulators
- ✅ Using the circuit breaker and session manager patterns in other projects

---

## 🙏 Acknowledgments

- **[node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)** — The battle-tested Telegram client that powers the polling core
- **[CCXT](https://github.com/ccxt/ccxt)** — The unified crypto exchange library enabling multi-market price feeds
- **[Google Gemini](https://ai.google.dev/)** — The generative AI backbone for vibe profiling, brainstorming, and sentiment analysis
- **[Chart.js](https://www.chartjs.org/)** — Server-side chart rendering that makes financial visualization possible in a chat interface
- **[lowdb](https://github.com/typicode/lowdb)** — Zero-config JSON persistence that keeps the bot stateful without a database server
- **[Bun](https://bun.sh/)** — The runtime that makes local development instant with `--watch` hot-reload
- **[BMKG](https://www.bmkg.go.id/)** — Indonesian Meteorology Agency open API for hyperlocal weather and earthquake data

---

## 📞 Contact & Support

### Questions

- Open a [GitHub Issue](https://github.com/Jars44/telegram-bot/issues) for bugs or feature requests
- Include your Node.js version, OS, and the full error stack trace when reporting bugs

### Stay Updated

- **GitHub**: [github.com/jarsz/jarvis-telegram-bot](https://github.com/Jars44/telegram-bot)
- **Bot**: [@Jars44_Bot](https://t.me/Jars44_Bot) on Telegram

---

## 🎯 Quick Links

- [Live Bot on Telegram](https://t.me/Jars44_Bot)
- [GitHub Repository](https://github.com/Jars44/telegram-bot)
- [npm Dependencies](https://github.com/Jars44/telegram-bot/blob/main/package.json)
- [BMKG Weather API](https://data.bmkg.go.id/)
- [CCXT Exchange Library](https://docs.ccxt.com/)
- [Gemini API Console](https://aistudio.google.com/)

---

<div align="center">**A production-grade Telegram bot fusing real-time financial intelligence, AI-powered lifestyle curation, and personal productivity — all from a single chat.**</div>
