const axios = require("axios"); // Import axios for HTTP requests
const TelegramBot = require("node-telegram-bot-api");
// const AladhanAPI = "https://api.aladhan.com/v1"; // Import Aladhan API URL
// import OpenAI from "openai"; // Import OpenAI library
// const client = new OpenAI();
// var cron = require("node-cron"); // Import cron library
// const jikanjs = require("@mateoaranda/jikanjs"); // Import JikanJS library
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
  bot.sendMessage(chatId, "Mencari quote...");
  const chatId = msg.chat.id;
  const res = await fetch("https://favqs.com/api/qotd");
  const data = await res.json();
  const quote = data.quote.body;
  const author = data.quote.author;
  bot.sendMessage(chatId, `"${quote}"\n\n- ${author}`);
});