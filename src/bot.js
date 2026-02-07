require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const jikanjs = require("@mateoaranda/jikanjs");
var cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

let reminders = [];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stikerLimit = 5;
const resetTime = 10 * 60 * 1000;

let userLimit = {};

function resetLimit() {
  userLimit = {};
}

setInterval(resetLimit, resetTime);

const token = process.env.BOT_TOKEN;
const options = {
  polling: true,
};

const bot = new TelegramBot(token, options);

const userDownloadState = new Map();

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Selamat datang di @Jars44_Bot \nKetik /help untuk panduan penggunaan bot ini.");
});

bot.onText(/\/stop/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Bye! Semoga harimu menyenangkan! \nKetik /start untuk memulai lagi");
});

bot.onText(/\/gempa/, async (msg) => {
  const chatId = msg.chat.id;
  const url = "https://data.bmkg.go.id/DataMKG/TEWS/";

  try {
    const searchingMessage = await bot.sendMessage(chatId, "🔍 Mencari data gempa terbaru...");
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
Magnitudo: ${Magnitude} SR
Kedalaman: ${Kedalaman}
Wilayah: ${Wilayah}
Potensi: ${Potensi}
`;

    if (!image) {
      await bot.editMessageText("❌ Gagal mengirim gambar. URL tidak valid.", {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
      return;
    }

    await bot.deleteMessage(chatId, searchingMessage.message_id);

    await bot.sendPhoto(chatId, image, {
      caption: resultText,
    });
  } catch (error) {
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

  const searchingMessage = await bot.sendMessage(chatId, `🔍 Mencari lirik "${title}" oleh ${artist}...`);

  try {
    const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    if (!res.data.lyrics) {
      throw new Error("Lirik tidak ditemukan");
    }

    const lyrics = res.data.lyrics.replace(/\r\n/g, "\n").replace(/(\n{3,})/g, "\n\n");

    await bot.editMessageText(`🎵 *${title}* - ${artist}\n\n${lyrics}`, {
      chat_id: chatId,
      message_id: searchingMessage.message_id,
      parse_mode: "Markdown",
    });
  } catch (error) {
    await bot.editMessageText(`❌ Gagal menemukan lirik "${title}" oleh ${artist}. \nSilakan coba lagi nanti.`, {
      chat_id: chatId,
      message_id: searchingMessage.message_id,
    });
  }
});

bot.onText(/\/quote/, async (msg) => {
  const chatId = msg.chat.id;
  const searchingMessage = await bot.sendMessage(chatId, "🔍 Mencari quote...");
  try {
    const res = await fetch("https://favqs.com/api/qotd");
    if (!res.ok) throw new Error("Gagal mengambil quote");
    const data = await res.json();
    if (!data.quote) throw new Error("Quote tidak ditemukan");
    const quote = data.quote.body;
    const author = data.quote.author;
    await bot.editMessageText(`"${quote}"\n\n- ${author}`, {
      chat_id: chatId,
      message_id: searchingMessage.message_id,
    });
  } catch (error) {
    await bot.editMessageText("❌ Gagal mengambil quote. Silakan coba lagi nanti.", {
      chat_id: chatId,
      message_id: searchingMessage.message_id,
    });
  }
});

bot.onText(/\/anime (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const keyword = match[1];

  try {
    const searchingMessage = await bot.sendMessage(chatId, `🔍 Mencari anime "${keyword}"...`);
    const result = await jikanjs.search("anime", keyword);
    const anime = result.data[0];

    const reply = `
🎥 *${anime.title}* (${anime.type})
📅 Tayang: ${anime.aired.prop.from.year}
⭐ Skor: ${anime.score}
🧾 ${anime.synopsis.substring(0, 500)}...

🔗 [Lihat di MAL](${anime.url})
`;

    await bot.deleteMessage(chatId, searchingMessage.message_id);

    await bot.sendPhoto(chatId, anime.images.jpg.image_url, {
      caption: reply,
      parse_mode: "Markdown",
    });
  } catch (err) {
    bot.sendMessage(chatId, "Gagal mencari anime, Silakan coba lagi nanti.");
  }
});

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
    return null;
  }
}

bot.onText(/\/cuaca(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const location = match[1] ? match[1].trim() : "Malang";

  try {
    const searchingMessage = await bot.sendMessage(chatId, `🔍 Mencari data cuaca di ${location}...`);
    let lat = -7.98;
    let lon = 112.63;
    let locationName = "Malang";

    if (location) {
      const coords = await getCoordinates(location);
      if (!coords) {
        await bot.editMessageText(`❌ Lokasi "${location}" tidak ditemukan. Coba dengan nama daerah lain.`, {
          chat_id: chatId,
          message_id: searchingMessage.message_id,
        });
        return;
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

    await bot.editMessageText(
      `🌤 Cuaca di ${locationName}:\nSuhu: ${weather.temperature}°C\nAngin: ${weather.windspeed} km/h\nSiang/Malam: ${
        weather.is_day ? "Siang" : "Malam"
      }`,
      {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      }
    );
  } catch (error) {
    bot.sendMessage(chatId, "❌ Gagal mengambil data cuaca. Silakan coba lagi nanti.");
  }
});

bot.onText(/\/berita/, async (msg) => {
  const chatId = msg.chat.id;
  const searchingMessage = await bot.sendMessage(chatId, "🔍 Mencari berita terbaru...");
  try {
    const gnewsToken = process.env.GNEWS_API_TOKEN;
    const res = await fetch(
      `https://gnews.io/api/v4/top-headlines?token=${gnewsToken}&lang=id&max=1`
    );
    if (!res.ok) throw new Error("Gagal mengambil berita");
    const data = await res.json();
    if (!data.articles || data.articles.length === 0) throw new Error("Berita tidak ditemukan");
    const article = data.articles[0];
    await bot.editMessageText(`📰 Berita Terkini:\n${article.title}\n\n${article.description}\n\n${article.url}`, {
      chat_id: chatId,
      message_id: searchingMessage.message_id,
    });
  } catch (error) {
    await bot.editMessageText("❌ Gagal mengambil berita. Silakan coba lagi nanti.", {
      chat_id: chatId,
      message_id: searchingMessage.message_id,
    });
  }
});

bot.onText(/\/sholat (.+)/, async (msg, match) => {
  const kota = match[1];
  const chatId = msg.chat.id;
  const searchingMessage = await bot.sendMessage(chatId, `🔍 Mencari jadwal sholat di ${kota}...`);
  try {
    const res = await axios.get(`https://api.aladhan.com/v1/timingsByCity?city=${kota}&country=Indonesia&method=11`);
    if (!res.data || !res.data.data || !res.data.data.timings) {
      await bot.editMessageText(`❌ Data jadwal tidak valid`, {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      });
      return;
    }
    const data = res.data.data.timings;

    await bot.editMessageText(
      `🕌 Jadwal Sholat di ${kota}:
Subuh: ${data.Fajr}
Dzuhur: ${data.Dhuhr}
Ashar: ${data.Asr}
Maghrib: ${data.Maghrib}
Isya: ${data.Isha}`,
      {
        chat_id: chatId,
        message_id: searchingMessage.message_id,
      }
    );
  } catch (err) {
    await bot.editMessageText(`❌ Gagal mengambil jadwal sholat di ${kota}. Silakan coba lagi nanti.`, {
      chat_id: chatId,
      message_id: searchingMessage.message_id,
    });
  }
});

bot.onText(/\/ingatkan (\d{1,2}:\d{2}) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const waktu = match[1];
  const pesan = match[2];

  reminders.push({ chatId, waktu, pesan });
  bot.sendMessage(chatId, `⏰ Siap! Gue bakal ingetin jam ${waktu} buat: "${pesan}"`);
});

cron.schedule("* * * * *", () => {
  const now = new Date();
  const jam = now.getHours().toString().padStart(2, "0");
  const menit = now.getMinutes().toString().padStart(2, "0");
  const sekarang = `${jam}:${menit}`;

  reminders = reminders.filter((reminder) => {
    if (reminder.waktu === sekarang) {
      bot.sendMessage(reminder.chatId, `🔔 Pengingat: ${reminder.pesan}`);
      return false;
    }
    return true;
  });
});

cron.schedule("0 7 * * *", () => {
  reminders.forEach((reminder) => {
    bot.sendMessage(reminder.chatId, "Selamat pagi! Jangan lupa sarapan 🍳");
  });
});

bot.onText(/\/download/, (msg) => {
  const chatId = msg.chat.id;
  userDownloadState.set(chatId, { step: "source" });

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "YouTube", callback_data: "source_youtube" },
          { text: "TikTok", callback_data: "source_tiktok" },
        ],
      ],
    },
  };

  bot.sendMessage(chatId, "Pilih sumber download ⬇️", options);
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const state = userDownloadState.get(chatId) || {};

  const data = query.data;

  if (data.startsWith("source_")) {
    const source = data.split("_")[1];
    state.source = source;
    state.step = "format";
    userDownloadState.set(chatId, state);

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "MP4 (Video)", callback_data: "format_mp4" },
            { text: "MP3 (Audio)", callback_data: "format_mp3" },
          ],
        ],
      },
    };

    bot.editMessageText(`Sumber: ${source.toUpperCase()}\nSekarang pilih format`, {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: options.reply_markup,
    });
  }

  if (data.startsWith("format_")) {
    const format = data.split("_")[1];
    state.format = format;
    state.step = "link";
    userDownloadState.set(chatId, state);

    bot.editMessageText(`✅ Format: ${format.toUpperCase()}\nSekarang kirim link-nya 🔗`, {
      chat_id: chatId,
      message_id: query.message.message_id,
    });
  }
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const state = userDownloadState.get(chatId);

  if (state?.step === "link" && msg.text.startsWith("https")) {
    const { source, format } = state;
    const url = msg.text;

    bot.sendMessage(chatId, "⏳ Sedang proses, tunggu bentar ya...");

    try {
      let apiUrl = "";
      if (source === "youtube") {
        apiUrl = `https://tools.opslinuxsec.com/ytdl/download.php?format=${format}&url=${encodeURIComponent(url)}`;
      } else if (source === "tiktok") {
        apiUrl = `https://tools.opslinuxsec.com/ttdl/download.php?url=${encodeURIComponent(url)}&format=${format}`;
      }

      if (!apiUrl) {
        bot.sendMessage(chatId, "⚠️ Gagal ambil file. Coba cek link-nya lagi.");
        userDownloadState.delete(chatId);
        return;
      }

      const res = await axios.get(apiUrl, { responseType: "stream" });
      const contentType = res.headers["content-type"];

      if (contentType && contentType.includes("application/json")) {
        let data = "";
        for await (const chunk of res.data) {
          data += chunk;
        }
        try {
          data = JSON.parse(data);
        } catch (parseErr) {
          bot.sendMessage(chatId, "⚠️ Gagal ambil file. Coba cek link-nya lagi.");
          userDownloadState.delete(chatId);
          return;
        }

        if (data.status === "success" && data.url) {
          if (format === "mp4") {
            bot.sendVideo(chatId, data.url, { caption: "📽️ Nih videonya" });
          } else {
            bot.sendAudio(chatId, data.url, { caption: "🎧 Nih audionya" });
          }
        } else {
          bot.sendMessage(chatId, "⚠️ Gagal ambil file. Coba cek link-nya lagi.");
        }
      } else if (
        contentType &&
        (contentType.includes("application/octet-stream") ||
          contentType.includes("video") ||
          contentType.includes("audio"))
      ) {
        const ext = format === "mp4" ? ".mp4" : ".mp3";
        const timestamp = Date.now();
        const prefix = format === "mp4" ? "video" : "audio";
        const tempFilePath = path.join(__dirname, "..", "temp", `${prefix}-${timestamp}${ext}`);
        const writer = fs.createWriteStream(tempFilePath);

        res.data.pipe(writer);

        writer.on("finish", () => {
          if (format === "mp4") {
            bot
              .sendVideo(chatId, tempFilePath, { caption: "📽️ Nih videonya" }, { contentType: "video/mp4" })
              .then(() => {
                fs.unlink(tempFilePath, (err) => {
                  if (err) console.error("Failed to delete temp file:", err);
                });
              });
          } else {
            bot
              .sendAudio(chatId, tempFilePath, { caption: "🎧 Nih audionya" }, { contentType: "audio/mp3" })
              .then(() => {
                fs.unlink(tempFilePath, (err) => {
                  if (err) console.error("Failed to delete temp file:", err);
                });
              });
          }
        });

        writer.on("error", (err) => {
          bot.sendMessage(chatId, "🚨 Ada error pas ngambil file!");
          userDownloadState.delete(chatId);
        });
      } else {
        bot.sendMessage(chatId, "⚠️ Gagal ambil file. Coba cek link-nya lagi.");
      }
    } catch (err) {
      bot.sendMessage(chatId, "🚨 Ada error pas ngambil file!");
    }

    userDownloadState.delete(chatId);
  }
});

bot.onText(/\/film (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const keyword = match[1];
  const searchingMessage = await bot.sendMessage(chatId, `🔍 Mencari film "${keyword}"...`);
  try {
    const res = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        query: keyword,
      },
    });
    const film = res.data.results[0];
    const reply = `
Film: ${film.title}
Tahun: ${film.release_date}
Rating: ${film.vote_average}
Deskripsi: ${film.overview}

🔗 [Lihat di TMDB](${film.page})`;

    await bot.deleteMessage(chatId, searchingMessage.message_id);
    await bot.sendPhoto(chatId, `https://image.tmdb.org/t/p/w500${film.poster_path}`, {
      caption: reply,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText("❌ Gagal mencari film. Silakan coba lagi nanti.", {
      chat_id: chatId,
      message_id: searchingMessage.message_id,
    });
  }
});

bot.onText(/\/stiker (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const sender = msg.from.id;
  const text = match[1];
  const from = msg.from.first_name || msg.from.username || "User";

  if (!userLimit[sender]) {
    userLimit[sender] = { stiker: 0 };
  }

  if (userLimit[sender].stiker >= stikerLimit) {
    await bot.sendMessage(chatId, `Limit /stiker tercapai! (maks ${stikerLimit}) \nSilakan coba lagi nanti.`);
    return;
  }

  const maxCharsPerLine = 20;
  let lines = [];
  const content = text.trim();

  if (!content) {
    await bot.sendMessage(chatId, "Kirim teks setelah /stiker!");
    return;
  }

  let loadingMessage;
  try {
    loadingMessage = await bot.sendMessage(chatId, "sedang membuat stiker...");

    const inputLines = content.split(/\r?\n/);

    inputLines.forEach((inputLine) => {
      let currentLine = "";
      inputLine.split(" ").forEach((word) => {
        if ((currentLine + word).length > maxCharsPerLine) {
          lines.push(currentLine.trim());
          currentLine = "";
        }
        currentLine += word + " ";
      });
      if (currentLine.trim()) lines.push(currentLine.trim());
    });

    const longestLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);

    const charToFontSizeMap = {
      1: 280,
      3: 190,
      4: 160,
      5: 130,
      6: 110,
      7: 95,
      8: 85,
      9: 75,
      10: 68,
      11: 60,
      12: 55,
      13: 50,
      14: 45,
      15: 40,
    };

    let fontSize;
    if (longestLineLength <= 4) {
      fontSize = 160;
    } else if (longestLineLength >= 15) {
      fontSize = 40;
    } else {
      fontSize = charToFontSizeMap[longestLineLength] || 40;
    }

    const svgTextLines = lines
      .map((line, i) => {
        const lineHeight = fontSize * 1.2;
        const totalTextHeight = lineHeight * lines.length;
        const startY = (512 - totalTextHeight) / 2 + lineHeight / 2;
        const y = startY + i * lineHeight;
        return `<text x="50%" y="${y}" text-anchor="middle">${line}</text>`;
      })
      .join("");

    const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
                    <style>
                      text {
                        fill: black;
                        font-family: "Helvetica", "Arial", sans-serif;
                        font-size: ${fontSize}px;
                        white-space: pre-wrap;
                        dominant-baseline: middle;
                      }
                    </style>
                    <rect width="100%" height="100%" fill="white" />
                    ${svgTextLines}
                  </svg>`;

    const webpPath = path.join(__dirname, "..", "temp", "stiker.webp");
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      },
    })
      .composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0,
        },
      ])
      .webp()
      .toFile(webpPath);

    await bot.sendSticker(chatId, webpPath, {
      caption: `Stiker dari ${sender} (${userLimit[sender].stiker + 1}/${stikerLimit})`,
    });

    userLimit[sender].stiker++;

    await delay(3000);
    fs.unlinkSync(webpPath);
    await bot.deleteMessage(chatId, loadingMessage.message_id);
  } catch (error) {
    if (loadingMessage) {
      await bot.editMessageText("❌ Gagal membuat stiker. Silakan coba lagi nanti.", {
        chat_id: chatId,
        message_id: loadingMessage.message_id,
      });
    } else {
      await bot.sendMessage(chatId, "❌ Gagal membuat stiker. Silakan coba lagi nanti.");
    }
  }
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
/film - Cari Film \n(Gunakan Format /film <judul film>) \nContoh: /film Avengers \n
/download - Download Video/Audio \n(Youtube / TikTok) \n
/stiker - Buat Stiker dari Teks \n(Gunakan Format /stiker <teks>) \nContoh: /stiker Halo! \nExperimental Feature! \n
/ingatkan - Set Pengingat \n(Gunakan Format /ingatkan <jam> <pesan>) \nContoh: /ingatkan 12:00 Makan Siang \nExperimental Feature!`
  );
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text ? msg.text.toLowerCase() : "";

  const validCommands = [
    /^\/lirik/,
    /^\/quote/,
    /^\/anime/,
    /^\/cuaca/,
    /^\/berita/,
    /^\/sholat/,
    /^\/gempa/,
    /^\/help/,
    /^\/start/,
    /^\/stop/,
    /^\/ingatkan/,
    /^\/download/,
    /^\/film/,
    /^\/stiker/,
  ];

  const incompleteCommands = [/^\/sholat$/, /^\/anime$/, /^\/lirik$/, /^\/ingatkan$/, /^\/film$/, /^\/stiker$/];

  const isInvalidCommand = text.startsWith("/") && !validCommands.some((cmd) => cmd.test(text));

  const isIncompleteCommand = incompleteCommands.some((cmd) => cmd.test(text));

  if (isInvalidCommand) {
    bot.sendMessage(chatId, "Saya tidak mengerti \nKetik /help untuk mendapatkan bantuan.");
    return;
  } else if (isIncompleteCommand) {
    bot.sendMessage(chatId, "Format salah! \nKetik /help untuk mendapatkan bantuan.");
    return;
  }

  if (!text.startsWith("/") && !text.startsWith("https")) {
    const isRandomText =
      text.length >= 4 &&
      !text.includes(" ") &&
      !text.match(/^[0-9]+$/) &&
      (/[a-z]{6,}/i.test(text) || /(.)\1{3,}/.test(text));

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
      const randomNum = Math.floor(Math.random() * 5);

      if (randomNum < 2) {
        const replies = ["apalah", "apa coba"];
        bot.sendMessage(chatId, replies[randomNum]);
      } else {
        const stickerOptions = ["stk1.webm", "stk2.webm", "stk3.webm"];
        const stickerIndex = randomNum - 3;
        const Sticker = fs.readFileSync(path.join(__dirname, "..", "assets", stickerOptions[stickerIndex]));
        bot.sendSticker(chatId, Sticker);
      }
    }
  }
});
