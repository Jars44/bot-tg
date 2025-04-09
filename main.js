const axios = require("axios"); // Import axios for HTTP requests
// const cheerio = require("cheerio"); // Import cheerio for web scraping
const TelegramBot = require("node-telegram-bot-api");
// const AladhanAPI = "https://api.aladhan.com/v1"; // Import Aladhan API URL
// const jikanjs = require("@mateoaranda/jikanjs"); // Import JikanJS library
// import OpenAI from "openai"; // Import OpenAI library
// const client = new OpenAI();
// var cron = require("node-cron"); // Import cron library
// const zenquotesAPI = "https://zenquotes.io/api/quotes/"; // Import ZenQuotes API URL
// const { Translate } = require("@google-cloud/translate").v2; // Import Google Cloud Translate library
// const lyricsAPI = "https://api.lyrics.ovh/v1/artist/title"; // Import Lyrics API URL
// const weatherAPI = "http://api.weatherapi.com/v1/"; // Import Weather API URL
// const uselessfacts = { "GET https://uselessfacts.jsph.pl/random.json" } // Import Useless Facts API URL
// const NewsAPI = require("newsapi"); // Import NewsAPI library
// const newsapi = new NewsAPI("API_KEY");
// To query /v2/top-headlines
// All options passed to topHeadlines are optional, but you need to include at least one of them

const token = "process.env.BOT_TOKEN";
const options = {
  polling: true,
};

const bot = new TelegramBot(token, options);

const prefix = ".";

const sayHi = new RegExp(`^${prefix}halo$`);
const gempa = new RegExp(`^${prefix}gempa$`);

bot.onText(sayHi, (callback) => {
  bot.sendMessage(callback.from.id, "Halo juga!");
});

bot.onText(gempa, async (callback) => {
  const url = "https://data.bmkg.go.id/DataMKG/TEWS/";

  const apiCall = await fetch(url + "/autogempa.json");
  const {
    Infogempa: {
      gempa: { Tanggal, Jam, Magnitude, Kedalaman, Wilayah, Potensi, Coordinates, Lintang, Bujur, Shakemap },
    },
  } = await apiCall.json();

  const image = url + Shakemap;

  const resultText = `
  Waktu: ${Tanggal} | ${Jam}
  Koordinat: ${Coordinates}
  Lintang: ${Lintang}
  Bujur: ${Bujur}
  Magnitudo: ${Magnitude}
  Kedalaman: ${Kedalaman}
  Wilayah: ${Wilayah}
  Potensi: ${Potensi}
  `;

  bot.sendMessage(callback.from.id, "Ini berita gempa!");
  bot.sendPhoto(callback.from.id, image, {
    caption: resultText,
  });
});

// bot.on("message", (callback) => {
//   if (!sayHi.test(callback.text) && !gempa.test(callback.text)) {
//     bot.sendMessage(callback.from.id, "apalah");
//   }
// });

bot.onText(/\/lirik (.+) /, async (msg, match) => {
  const input = match[1];
  const [artist, title] = input.split(" - ");
  const chatId = msg.chat.id;

  if (!artist || !title) {
    return bot.sendMessage(chatId, "Format salah! Gunakan: /lirik artist - title");
  }
  bot.sendMessage(chatId, "Mencari lirik...");
  try {
    const res = await axios.get(`https://api.lyrics.ovh/v1/${artist}/${title}`);
    bot.sendMessage(chatId, `Lirik :\n${res.data.lyrics}`);
  } catch (error) {
    bot.sendMessage(chatId, "Lirik tidak ditemukan!");
  }
});

bot.onText(/\/quote/, async (msg) => {
  const chatId = msg.chat.id;
  const res = await fetch("https://favqs.com/api/qotd");
  const data = await res.json();
  const quote = data.quote.body;
  const author = data.quote.author;
  bot.sendMessage(chatId, `"${quote}"\n\n- ${author}`);
});

// bot.onText(/\/quote|\/bijak/, async (msg) => {
//   const chatId = msg.chat.id;
//   try {
//     const res = await axios.get("https://jagokata.com/kata-bijak/acak.html");
//     const $ = cheerio.load(res.data);
//     const quote = $(".quote").first().text().trim();
//     const author = $(".author").first().text().trim();

//     bot.sendMessage(chatId, `💬 *"${quote}"*\n\n— ${author}`, { parse_mode: "Markdown" });
//   } catch (err) {
//     bot.sendMessage(chatId, "Gagal ambil quote bro 😢");
//   }
// });

// bot.onText(/\/anime (.+)/, async (msg, match) => {
//   const query = match[1];
//   const chatId = msg.chat.id;

//   try {
//     const res = await jikanjs.search("anime", query);
//     const anime = res.results[0];

//     bot.sendMessage(
//       chatId,
//       `🎬 ${anime.title}
// 📅 Rilis: ${anime.start_date}
// 📈 Skor: ${anime.score}
// 📝 Sinopsis: ${anime.synopsis}`
//     );
//   } catch (err) {
//     bot.sendMessage(chatId, "Anime gak ketemu, bro 😅");
//   }
// });

// bot.onText(/\/cuaca (.+)/, async (msg, match) => {
//   const lokasi = match[1];
//   const chatId = msg.chat.id;

//   try {
//     // Contoh: Koordinat Malang
//     const lat = -7.983908;
//     const lon = 112.621391;

//     const res = await axios.get(
//       `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
//     );

//     const cuaca = res.data.current_weather;
//     bot.sendMessage(
//       chatId,
//       `Cuaca sekarang:
// 🌡️ Suhu: ${cuaca.temperature}°C
// 💨 Angin: ${cuaca.windspeed} km/h`
//     );
//   } catch (err) {
//     bot.sendMessage(chatId, "Gagal mengambil info cuaca 😓");
//   }
// });

bot.onText(/\/cuaca/, async (msg) => {
  const chatId = msg.chat.id;
  const res = await fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=-7.98&longitude=112.63&current_weather=true"
  );
  const data = await res.json();
  const weather = data.current_weather;
  bot.sendMessage(
    chatId,
    `🌤 Cuaca sekarang:\nSuhu: ${weather.temperature}°C\nAngin: ${weather.windspeed} km/h ${weather.is_day}`
  );
});

bot.onText(/\/berita/, async (msg) => {
  const chatId = msg.chat.id;
  const res = await fetch(
    "https://gnews.io/api/v4/top-headlines?token=process.env.GNEWS_API_TOKEN&lang=id&max=1"
  );
  const data = await res.json();
  const article = data.articles[0];
  bot.sendMessage(chatId, `📰 Berita Terkini:\n${article.title}\n\n${article.description}\n\n${article.url}`);
});

// bot.onText(/\/translate (.+)/, async (msg, match) => {
//   const chatId = msg.chat.id;
//   const text = match[1];
//   const res = await fetch("https://libretranslate.com/translate", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({
//       q: text,
//       source: "en",
//       target: "id",
//       format: "text",
//     }),
//   });
//   const data = await res.json();
//   bot.sendMessage(chatId, `🈯 Hasil terjemahan:\n${data.translatedText}`);
// });

// bot.onText(/\/tanya (.+)/, async (msg, match) => {
//   const chatId = msg.chat.id;
//   const prompt = match[1];

//   const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       Authorization: `Bearer YOUR_OPENROUTER_KEY`,
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       model: "openai/gpt-3.5-turbo",
//       messages: [{ role: "user", content: prompt }],
//     }),
//   });

//   const data = await res.json();
//   const reply = data.choices[0].message.content;
//   bot.sendMessage(chatId, reply);
// });