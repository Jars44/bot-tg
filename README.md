# Telegram BOT

Telegram Bot with various useful commands including earthquake info, lyrics search, quotes, anime info, weather, news, prayer times, reminders, downloads from YouTube/TikTok, movie search, sticker creation from text, and more.

## Features

- /start - Start the bot
- /stop - Stop the bot
- /help - Show help and list of commands
- /gempa - Get latest earthquake information
- /berita - Get latest news headlines
- /quote - Get quote of the day
- /cuaca <city> - Get weather information for a city (default: Malang)
- /sholat <city> - Get prayer times for a city in Indonesia
- /anime <title> - Search for anime information
- /lirik <artist> - <title> - Search for song lyrics
- /film <title> - Search for movie information
- /download - Download video/audio from YouTube or TikTok
- /stiker <text> - Create a sticker from text
- /ingatkan <HH:mm> <message> - Set a reminder

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd tg-bot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root with your Telegram bot token:

   ```
   BOT_TOKEN=your_telegram_bot_token_here
   ```

4. Update the code to use the `BOT_TOKEN` environment variable instead of hardcoding the token (recommended for security).

## Usage

Start the bot with:

```bash
npm run bot
```

Interact with the bot on Telegram by sending commands as listed in the Features section.

## Notes

- The bot token is currently hardcoded in the source code (`main.js` and `script.js`). It is highly recommended to use environment variables for security.
- The bot uses polling to receive updates.
- Some features rely on external APIs; ensure you have internet connectivity.

## License

This project is licensed under the terms of the MIT License. See the [LICENSE](LICENSE) file for details.