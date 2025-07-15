# Telegram BOT

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/tg-bot.svg)](https://www.npmjs.com/package/tg-bot)

## Project Description
This Telegram Bot provides a wide range of useful commands including earthquake info, lyrics search, quotes, anime info, weather, news, prayer times, reminders, downloads from YouTube/TikTok, movie search, sticker creation from text, and more. It is designed to be a versatile assistant for Telegram users.

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

## Architecture
The bot is built using Node.js and interacts with the Telegram Bot API using polling. It handles commands by parsing user messages and responding accordingly. External APIs are used to fetch data for features like weather, news, and anime info. The bot's codebase is modular, separating command handlers and utility functions for maintainability.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Jars44/bot-tg.git
   cd tg-bot
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## Configuration

Create a `.env` file in the project root with the following content:

```
BOT_TOKEN=your_telegram_bot_token_here
```

It is highly recommended to use environment variables for sensitive data like the bot token instead of hardcoding it in the source code.

## Usage

Start the bot with:

```bash
npm run bot
```

Interact with the bot on Telegram by sending commands as listed in the Features section.

## Commands Examples

- `/start`  
  Starts the bot and sends a welcome message.

- `/gempa`  
  Returns the latest earthquake information.

- `/cuaca Jakarta`  
  Provides weather information for Jakarta.

- `/stiker Hello World`  
  Creates a sticker with the text "Hello World".

## Contributing

Contributions are welcome! Please follow these guidelines:

- Fork the repository and create your branch from `main`.
- Ensure any install or build dependencies are removed before the end of the layer when doing a build.
- Update the README.md with details of changes to the interface, including new environment variables, exposed ports, useful file locations, and container parameters.
- Increase the version numbers in any example files and the README.md to the new version that this Pull Request would represent.
- You may merge the Pull Request once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

## Troubleshooting

- Verify that your Telegram bot token is correct and has the necessary permissions.
- Ensure your internet connection is stable as some features rely on external APIs.
- Check the console output for error messages.
- If the bot does not respond, verify that the polling mechanism is running correctly.
- For issues with specific commands, check the relevant API service status.

## License

This project is licensed under the terms of the MIT License. See the [LICENSE](LICENSE) file for details.
