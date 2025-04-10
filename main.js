const TelegramBot = require("node-telegram-bot-api");

const axios = require("axios"); // Import axios for HTTP requests
// const cheerio = require("cheerio"); // Import cheerio for web scraping
const jikanjs = require("@mateoaranda/jikanjs"); // Import JikanJS library
// var cron = require("node-cron"); // Import cron library

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

bot.onText(/\/anime (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const keyword = match[1];

  try {
    const result = await jikanjs.search("anime", keyword);
    const anime = result.data[0]; // Ambil hasil pertama

    const reply = `
🎥 *${anime.title}* (${anime.type})
📅 Tayang: ${anime.aired.prop.from.year}
⭐ Skor: ${anime.score}
🧾 ${anime.synopsis.substring(0, 500)}...

🔗 [Lihat di MAL](${anime.url})
`;

    bot.sendPhoto(chatId, anime.images.jpg.image_url, {
      caption: reply,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, "Gagal cari anime bro, coba lagi nanti 🙏");
  }
});

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

bot.onText(/\/translate (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1];
  const res = await fetch("https://libretranslate.com/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: text,
      source: "en",
      target: "id",
      format: "text",
    }),
  });
  const data = await res.json();
  bot.sendMessage(chatId, `🈯 Hasil terjemahan:\n${data.translatedText}`);
});

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

bot.onText(/\/shalat (.+)/, async (msg, match) => {
  const kota = match[1];
  const chatId = msg.chat.id;

  try {
    const res = await axios.get(
      `https://api.aladhan.com/v1/timingsByCity?city=${kota}&country=Indonesia&method=11`
    );
    const data = res.data.data.timings;

    bot.sendMessage(
      chatId,
      `🕌 Jadwal Shalat di ${kota}:
Subuh: ${data.Fajr}
Dzuhur: ${data.Dhuhr}
Ashar: ${data.Asr}
Maghrib: ${data.Maghrib}
Isya: ${data.Isha}`
    );
  } catch (err) {
    bot.sendMessage(chatId, "Gagal ambil jadwal shalat 😢");
  }
});

// General message handler
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.toLowerCase() : '';
  
  // Check for random text patterns (like "adsfgugirugasuyerfyuwgu")
  const isRandomText = text.length > 8 && 
    !text.includes(' ') && 
    /([a-zA-Z])\1{2,}/.test(text);
  
  // Check for insults
  const insults = ['bego', 'goblok', 'tolol', 'anjing', 'bangsat', 'babi', 'kontol', 'memek', 'asu', 'jancok', 'pukimak', 'bajingan', 'brengsek', 'dongok'];
  const isInsult = insults.some(word => text.includes(word));
  
  // List of all valid commands (both dot and slash)
  const validCommands = [
    sayHi, gempa,
    /^\/lirik/, /^\/quote/, /^\/anime/,
    /^\/cuaca/, /^\/berita/, /^\/translate/,
    /^\/shalat/
  ];

  // Check if it's an invalid command (starts with prefix or slash but not recognized)
  const isInvalidCommand = (text.startsWith(prefix) || text.startsWith('/')) && 
    !validCommands.some(cmd => cmd.test(text));
  
  if (isRandomText || isInsult) {
    bot.sendMessage(chatId, "apalah");
  } else if (isInvalidCommand) {
    bot.sendMessage(chatId, "saya tidak mengerti");
  }
});
