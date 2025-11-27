# Telegram Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![npm version](https://img.shields.io/npm/v/tg-bot.svg)](https://www.npmjs.com/package/tg-bot)

A versatile Telegram bot built with Node.js that provides a wide range of useful features including earthquake information, lyrics search, quotes, anime details, weather updates, news, prayer times, reminders, media downloads, movie search, and custom sticker creation. Designed as an all-in-one assistant for Telegram users.

## ✨ Features

| Command                       | Description                                            | Example                      |
| ----------------------------- | ------------------------------------------------------ | ---------------------------- |
| `/start`                      | Start the bot and receive a welcome message            | `/start`                     |
| `/stop`                       | Stop the bot                                           | `/stop`                      |
| `/help`                       | Display help and list of available commands            | `/help`                      |
| `/gempa`                      | Get the latest earthquake information from BMKG        | `/gempa`                     |
| `/berita`                     | Fetch the latest news headlines                        | `/berita`                    |
| `/quote`                      | Get a random quote of the day                          | `/quote`                     |
| `/cuaca [city]`               | Get weather information (default: Malang)              | `/cuaca Jakarta`             |
| `/sholat <city>`              | Get prayer times for Indonesian cities                 | `/sholat Jakarta`            |
| `/anime <title>`              | Search for anime information                           | `/anime One Piece`           |
| `/lirik <artist - title>`     | Search for song lyrics                                 | `/lirik Coldplay - Yellow`   |
| `/film <title>`               | Search for movie details                               | `/film Avengers`             |
| `/download`                   | Interactive download from YouTube/TikTok (video/audio) | `/download`                  |
| `/stiker <text>`              | Create a custom sticker from text                      | `/stiker Hello!`             |
| `/ingatkan <HH:mm> <message>` | Set a reminder                                         | `/ingatkan 12:00 Lunch time` |

## 🏗️ Architecture

The bot is built using **Node.js** and leverages the Telegram Bot API with polling for real-time message handling. It features:

- **Modular Design**: Command handlers are separated for maintainability.
- **External APIs**: Integrates with various APIs for data fetching (weather, news, anime, etc.).
- **Error Handling**: Robust error management with user-friendly messages.
- **Asynchronous Operations**: Uses async/await for efficient API calls.
- **File Management**: Temporary files are handled securely and cleaned up automatically.

## 📁 Project Structure

```
bot-tg/
├── src/
│   └── bot.js          # Main bot logic and command handlers
├── assets/
│   ├── stk1.webm       # Sticker assets for responses
│   ├── stk2.webm
│   └── stk3.webm
├── temp/               # Temporary files (downloads, generated stickers)
├── .env                # Environment variables (not committed)
├── .gitignore          # Git ignore rules
├── package.json        # Dependencies and scripts
├── README.md           # This file
└── LICENSE             # MIT License
```

## 🚀 Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/Jars44/bot-tg.git
   cd bot-tg
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
BOT_TOKEN=your_telegram_bot_token_here
```

### API Keys (Optional)

Some features require external API keys. Add them to your `.env` file:

```env
TMDB_API_KEY=your_tmdb_api_key_here
GNEWS_API_TOKEN=your_gnews_token_here
```

- **TMDB API Key**: Required for `/film` command. Get it from [The Movie Database](https://www.themoviedb.org/settings/api).
- **GNews Token**: Required for `/berita` command. Get it from [GNews](https://gnews.io/).

## ▶️ Running the Bot

Start the bot with:

```bash
npm run bot
```

The bot will start polling for messages. Interact with it on Telegram using the commands listed above.

## 📖 Usage Examples

- **Weather**: `/cuaca Surabaya` → Returns current weather for Surabaya.
- **Lyrics**: `/lirik Taylor Swift - Blank Space` → Fetches lyrics for the song.
- **Reminder**: `/ingatkan 15:30 Meeting with team` → Sets a reminder at 3:30 PM.
- **Sticker**: `/stiker Welcome!` → Generates a sticker with "Welcome!" text.

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m 'Add amazing feature'`.
4. Push to the branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

## 🐛 Troubleshooting

- **Bot not responding**: Check your bot token and ensure it's valid.
- **API errors**: Verify internet connection and API service status.
- **Download issues**: Ensure the provided URLs are valid and supported.
- **Sticker limits**: The bot has rate limits for sticker creation (5 per 10 minutes).
- **Console logs**: Check terminal output for detailed error messages.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
