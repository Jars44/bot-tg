const TelegramBot = require("node-telegram-bot-api");

// Global reminders array
let reminders = [];

const axios = require("axios"); // Import axios for HTTP requests
// const cheerio = require("cheerio"); // Import cheerio for web scraping
const jikanjs = require("@mateoaranda/jikanjs"); // Import JikanJS library
var cron = require("node-cron"); // Import cron library
// const musixmatchApi = "process.env.MUSIXMATCH_API_KEY"; // Musixmatch API key
const fs = require("fs");
const path = require("path");

const token = "process.env.BOT_TOKEN";
const options = {
  polling: true,
};

const bot = new TelegramBot(token, options);

bot.on("polling_error", (error) => {
  console.error("Polling Error:", {
    code: error.code,
    message: error.message,
    stack: error.stack,
    fullError: error,
  });
});

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Selamat datang di @Jars_Bot \nKetik /help untuk selengkapnya");
});

bot.onText(/\/stop/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Bye! Semoga harimu menyenangkan! \nKetik /start untuk memulai lagi");
});

bot.onText("tes", async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Tes berhasil!");
});

bot.onText(/\/gempa/, async (msg) => {
  const chatId = msg.chat.id;
  const url = "https://data.bmkg.go.id/DataMKG/TEWS/";

  try {
    bot.sendMessage(chatId, "🔍 Mencari data gempa terbaru...");
    const apiCall = await fetch(url + "/autogempa.json");
    const {
      Infogempa: {
        gempa: {
          Tanggal,
          Jam,
          Magnitude,
          Kedalaman,
          Wilayah,
          Potensi,
          Coordinates,
          Lintang,
          Bujur,
          Shakemap,
        },
      },
    } = await apiCall.json();

    const image = url + Shakemap;

    const resultText = `
Waktu: ${Tanggal} | ${Jam}
Koordinat: ${Coordinates}
Lintang: ${Lintang}
Bujur: ${Bujur}
Magnitudo: ${Magnitude} SR
Kedalaman: ${Kedalaman}
Wilayah: ${Wilayah}
Potensi: ${Potensi}
`;

    if (!image) {
      console.error("Image URL is undefined.");
      return bot.sendMessage(chatId, "❌ Gagal mengirim gambar. URL tidak valid.");
    }

    bot.sendPhoto(chatId, image, {
      caption: resultText,
    });
  } catch (error) {
    console.error("Error ambil data gempa:", error);
    bot.sendMessage(chatId, "Gagal mengambil data gempa. Silakan coba lagi nanti.");
  }
});

bot.onText(/\/lirik (.+)/, async (msg, match) => {
  const input = match[1].trim();
  const [artist, title] = input.split(" - ");
  const chatId = msg.chat.id;

  if (!artist || !title) {
    return bot.sendMessage(chatId, "Format salah! Contoh: /lirik Coldplay - Yellow");
  }

  bot.sendMessage(chatId, `🔍 Mencari lirik "${title}" oleh ${artist}...`);

  try {
    const res = await axios.get(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
    );
    if (!res.data.lyrics) {
      throw new Error("Lirik tidak ditemukan");
    }

    const lyrics = res.data.lyrics
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/(\n{3,})/g, "\n\n"); // Remove excessive newlines

    bot.sendMessage(chatId, `🎵 *${title}* - ${artist}\n\n${lyrics}`, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Lyrics search error:", error);
    bot.sendMessage(chatId, `❌ Gagal menemukan lirik "${title}" oleh ${artist}. \nSilakan coba lagi nanti.`);
  }
});

// Command untuk mencari lirik menggunakan Genius API
// bot.onText(/\/lirikg (.+)/, async (msg, match) => {
//   const input = match[1].trim();
//   const [artist, title] = input.split(" - ");
//   const chatId = msg.chat.id;

//   if (!artist || !title) {
//     return bot.sendMessage(chatId, "Format salah! Contoh: /lirikg Coldplay - Yellow");
//   }

//   bot.sendMessage(chatId, `🔍 Mencari lirik "${title}" oleh ${artist} di Genius...`);

//   try {
//     // Cari lagu di Genius
//     const searchRes = await axios.get(`${GENIUS_API_URL}/search`, {
//       params: { q: `${title} ${artist}` },
//       headers: { Authorization: `Bearer ${GENIUS_API_KEY}` }
//     });

//     const song = searchRes.data.response.hits[0]?.result;
//     if (!song) {
//       throw new Error('Lagu tidak ditemukan di Genius');
//     }

//     // Note: Diperlukan implementasi scraper untuk mengambil lirik dari Genius
//     // Ini hanya contoh - perlu disesuaikan dengan implementasi aktual
//     const lyricsRes = await axios.get(`https://example-lyrics-scraper.com/genius/${song.id}`);
//     const lyrics = lyricsRes.data.lyrics
//       .replace(/\r\n/g, "\n")
//       .replace(/(\n{3,})/g, "\n\n");

//     bot.sendMessage(chatId, `🎵 *${title}* - ${artist} (via Genius)\n\n${lyrics}`, {
//       parse_mode: "Markdown",
//     });
//   } catch (error) {
//     console.error("Genius lyrics search error:", error);
//     bot.sendMessage(chatId, `❌ Gagal menemukan lirik "${title}" di Genius\nCoba format: /lirikg <artist> - <title>`);
//   }
// });

bot.onText(/\/quote/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🔍 Mencari quote...");
  try {
    const res = await fetch("https://favqs.com/api/qotd");
    if (!res.ok) throw new Error("Gagal mengambil quote");
    const data = await res.json();
    if (!data.quote) throw new Error("Quote tidak ditemukan");
    const quote = data.quote.body;
    const author = data.quote.author;
    bot.sendMessage(chatId, `"${quote}"\n\n- ${author}`);
  } catch (error) {
    console.error("Quote error:", error);
    bot.sendMessage(chatId, "❌ Gagal mengambil quote. Silakan coba lagi nanti.");
  }
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
    bot.sendMessage(chatId, `🔍 Mencari anime "${keyword}"...`);
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
    bot.sendMessage(chatId, "Gagal mencari anime, Silakan coba lagi nanti.");
  }
});

// Fungsi untuk mendapatkan koordinat dari nama kota
async function getCoordinates(cityName) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}`
    );
    const data = await response.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

bot.onText(/\/cuaca(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const location = match[1] ? match[1].trim() : null;

  try {
    bot.sendMessage(chatId, `🔍 Mencari data cuaca di ${location}...`);
    let lat = -7.98; // Default Malang
    let lon = 112.63;
    let locationName = "Malang";

    if (location) {
      const coords = await getCoordinates(location);
      if (!coords) {
        return bot.sendMessage(
          chatId,
          `❌ Lokasi "${location}" tidak ditemukan. Coba dengan nama daerah lain.`
        );
      }
      lat = coords.lat;
      lon = coords.lon;
      locationName = location;
    }

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    const data = await res.json();
    const weather = data.current_weather;

    bot.sendMessage(
      chatId,
      `🌤 Cuaca di ${locationName}:\nSuhu: ${weather.temperature}°C\nAngin: ${
        weather.windspeed
      } km/h\nSiang/Malam: ${weather.is_day ? "Siang" : "Malam"}`
    );
  } catch (error) {
    console.error("Weather fetch error:", error);
    bot.sendMessage(chatId, "❌ Gagal mengambil data cuaca. Silakan coba lagi nanti.");
  }
});

bot.onText(/\/berita/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🔍 Mencari berita terbaru...");
  try {
    const res = await fetch(
      "https://gnews.io/api/v4/top-headlines?token=process.env.GNEWS_API_TOKEN&lang=id&max=1"
    );
    if (!res.ok) throw new Error("Gagal mengambil berita");
    const data = await res.json();
    if (!data.articles || data.articles.length === 0) throw new Error("Berita tidak ditemukan");
    const article = data.articles[0];
    bot.sendMessage(
      chatId,
      `📰 Berita Terkini:\n${article.title}\n\n${article.description}\n\n${article.url}`
    );
  } catch (error) {
    console.error("Berita error:", error);
    bot.sendMessage(chatId, "❌ Gagal mengambil berita. Silakan coba lagi nanti.");
  }
});

// bot.onText(/\/translate (.+)/, async (msg, match) => {
//   const chatId = msg.chat.id;
//   const text = match[1];
//   bot.sendMessage(chatId, "🔍 Menerjemahkan...");
//   try {
//     const res = await fetch("https://libretranslate.com/translate", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         q: text,
//         source: "auto",
//         target: "id",
//         format: "text",
//       }),
//     });
//     if (!res.ok) throw new Error("Gagal menerjemahkan");
//     const data = await res.json();
//     if (!data.translatedText) throw new Error("Terjemahan gagal");
//     bot.sendMessage(chatId, `🈯 Hasil terjemahan:\n${data.translatedText}`);
//   } catch (error) {
//     console.error("Translate error:", error);
//     bot.sendMessage(chatId, "❌ Gagal menerjemahkan. Silakan coba lagi nanti.");
//   }
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
//       model: "deepseek/deepseek-r1:free",
//       messages: [{ role: "user", content: prompt }],
//     }),
//   });

//   const data = await res.json();
//   const reply = data.choices[0].message.content;
//   bot.sendMessage(chatId, reply);
// });

bot.onText(/\/sholat (.+)/, async (msg, match) => {
  const kota = match[1];
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `🔍 Mencari jadwal sholat di ${kota}...`);
  try {
    const res = await axios.get(
      `https://api.aladhan.com/v1/timingsByCity?city=${kota}&country=Indonesia&method=11`
    );
    if (!res.data || !res.data.data || !res.data.data.timings) {
      throw new Error("Data jadwal tidak valid");
    }
    const data = res.data.data.timings;

    bot.sendMessage(
      chatId,
      `🕌 Jadwal Sholat di ${kota}:
Subuh: ${data.Fajr}
Dzuhur: ${data.Dhuhr}
Ashar: ${data.Asr}
Maghrib: ${data.Maghrib}
Isya: ${data.Isha}`
    );
  } catch (err) {
    console.error("Sholat error:", err);
    bot.sendMessage(chatId, `❌ Gagal mengambil jadwal sholat di ${kota}. Silakan coba lagi nanti.`);
  }
});

bot.onText(/\/ingatkan (\d{1,2}:\d{2}) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const waktu = match[1]; // format HH:mm
  const pesan = match[2];

  reminders.push({ chatId, waktu, pesan });
  bot.sendMessage(chatId, `⏰ Siap! Gue bakal ingetin jam ${waktu} buat: "${pesan}"`);
});

console.log("Cron job started, checking reminders every minute...");
// Cron yang jalan tiap menit
cron.schedule("* * * * *", () => {
  const now = new Date();
  const jam = now.getHours().toString().padStart(2, "0");
  const menit = now.getMinutes().toString().padStart(2, "0");
  const sekarang = `${jam}:${menit}`;

  cron.schedule("0 7 * * *", () => {
    bot.sendMessage(chatId, "Selamat pagi! Jangan lupa sarapan 🍳");
  });

  // Filter and process reminders
  reminders = reminders.filter((reminder) => {
    if (reminder.waktu === sekarang) {
      bot.sendMessage(reminder.chatId, `🔔 Pengingat: ${reminder.pesan}`);
      return false; // Remove this reminder
    }
    return true; // Keep other reminders
  });
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `/gempa - Berita Gempa Terbaru \n
/berita - Berita Terkini \n
/quote - Quote of the day \n
/cuaca - Cek Cuaca \n(Gunakan Format /cuaca <nama kota>) \nContoh: /cuaca Malang \n
/sholat - Jadwal Sholat \n(Gunakan Format /sholat <nama kota>) \nContoh: /sholat Malang \n
/anime - Cari Anime \n(Gunakan Format /anime <nama anime>) \nContoh: /anime One Piece \n
/lirik - Cari Lirik Lagu \n(Gunakan Format /lirik <penyanyi> - <judul>) \nContoh: /lirik Neigbourhood - Sweater Weather \n
/ingatkan - Set Pengingat \n(Gunakan Format /ingatkan <jam> <pesan>) \nContoh: /ingatkan 12:00 Makan Siang`
  );
});

// General message handler
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.toLowerCase() : "";

  // List of all valid commands
  const validCommands = [
    /^\/lirik/,
    /^\/quote/,
    /^\/anime/,
    /^\/cuaca/,
    /^\/berita/,
    /^\/translate/,
    /^\/sholat/,
    /^\/tanya/,
    /^\/gempa/,
    /^\/help/,
    /^\/start/,
    /^\/stop/,
    /^\/ingatkan/,
  ];

  // Check for incomplete commands
  const incompleteCommands = [
    /^\/sholat$/, // /shalat without city
    /^\/tanya$/, // /tanya without question
    /^\/anime$/, // /anime without title
    /^\/lirik$/, // /lirik without artist - title
    // /^\/cuaca$/, // /cuaca without location
    /^\/translate$/,
    /^\/ingatkan$/, // /ingatkan without time and message
  ];

  // Check if it's an invalid command (starts slash but not recognized)
  const isInvalidCommand = text.startsWith("/") && !validCommands.some((cmd) => cmd.test(text));

  const isIncompleteCommand = incompleteCommands.some((cmd) => cmd.test(text));

  if (isInvalidCommand) {
    bot.sendMessage(chatId, "Saya tidak mengerti \nKetik /help untuk mendapatkan bantuan.");
    return;
  } else if (isIncompleteCommand) {
    bot.sendMessage(chatId, "Format salah! \nKetik /help untuk mendapatkan bantuan.");
    return;
  }

  // Only check for random text/insults in non-command messages
  if (!text.startsWith("/")) {
    // More lenient random text detection
    const isRandomText =
      text.length >= 4 &&
      !text.includes(" ") &&
      !text.match(/^[0-9]+$/) && // Exclude pure numbers
      (/[a-z]{6,}/i.test(text) || /(.)\1{3,}/.test(text)); // Either 6+ letters or 4+ repeating chars

    // Check for insults
    const insults = [
      "bego",
      "goblok",
      "tolol",
      "anjing",
      "bangsat",
      "babi",
      "kontol",
      "memek",
      "asu",
      "jancok",
      "pukimak",
      "bajingan",
      "brengsek",
      "dongok",
      "cok",
      "bodo",
      "bodoh",
      "gak jelas",
      "gajelas",
      "gaje",
      "gk jelas",
    ];
    const isInsult = insults.some((word) => text.includes(word));

    if (isRandomText || isInsult) {
      // Random response selection with more variety
      const randomNum = Math.floor(Math.random() * 7); // 0-7

      if (randomNum < 4) {
        // Text response (0-3)
        const replies = ["apalah", "apa coba", "gajelas", "stress!"];
        bot.sendMessage(chatId, replies[randomNum]);
      } else {
        // Sticker response (4-7)
        const stickerOptions = ["stk1.webm", "stk2.webm", "stk3.webm"];
        const stickerIndex = randomNum - 4;
        const Sticker = fs.readFileSync(path.join(__dirname, "assets", stickerOptions[stickerIndex]));
        bot.sendSticker(chatId, Sticker);
      }
    }
  }
});
