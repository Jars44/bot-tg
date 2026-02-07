/**
 * All user-facing message strings (Indonesian)
 * Centralized for easy modification and localization
 */

export const MESSAGES = {
  // General
  WELCOME: "Selamat datang di @Jars44_Bot \nKetik /help untuk panduan penggunaan bot ini.",
  GOODBYE: "Bye! Semoga harimu menyenangkan! \nKetik /start untuk memulai lagi",
  UNKNOWN_COMMAND: "Saya tidak mengerti \nKetik /help untuk mendapatkan bantuan.",
  INVALID_FORMAT: "Format salah! \nKetik /help untuk mendapatkan bantuan.",

  // Search states
  SEARCHING: (topic: string) => `🔍 Mencari ${topic}...`,
  SEARCHING_EARTHQUAKE: "🔍 Mencari data gempa terbaru...",
  SEARCHING_LYRICS: (title: string, artist: string) => `🔍 Mencari lirik "${title}" oleh ${artist}...`,
  SEARCHING_ANIME: (keyword: string) => `🔍 Mencari anime "${keyword}"...`,
  SEARCHING_WEATHER: (location: string) => `🔍 Mencari data cuaca di ${location}...`,
  SEARCHING_NEWS: "🔍 Mencari berita terbaru...",
  SEARCHING_PRAYER: (city: string) => `🔍 Mencari jadwal sholat di ${city}...`,
  SEARCHING_MOVIE: (keyword: string) => `🔍 Mencari film "${keyword}"...`,
  SEARCHING_QUOTE: "🔍 Mencari quote...",

  // Errors
  ERROR_GENERIC: "Terjadi kesalahan. Silakan coba lagi nanti.",
  ERROR_EARTHQUAKE: "Gagal mengambil data gempa. Silakan coba lagi nanti.",
  ERROR_LYRICS: (title: string, artist: string) =>
    `❌ Gagal menemukan lirik "${title}" oleh ${artist}. \nSilakan coba lagi nanti.`,
  ERROR_LYRICS_FORMAT: "Format salah! Contoh: /lirik Coldplay - Yellow",
  ERROR_QUOTE: "❌ Gagal mengambil quote. Silakan coba lagi nanti.",
  ERROR_ANIME: "Gagal mencari anime, Silakan coba lagi nanti.",
  ERROR_WEATHER: "❌ Gagal mengambil data cuaca. Silakan coba lagi nanti.",
  ERROR_LOCATION_NOT_FOUND: (location: string) =>
    `❌ Lokasi "${location}" tidak ditemukan. Coba dengan nama daerah lain.`,
  ERROR_NEWS: "❌ Gagal mengambil berita. Silakan coba lagi nanti.",
  ERROR_PRAYER: (city: string) => `❌ Gagal mengambil jadwal sholat di ${city}. Silakan coba lagi nanti.`,
  ERROR_PRAYER_INVALID: "❌ Data jadwal tidak valid",
  ERROR_MOVIE: "❌ Gagal mencari film. Silakan coba lagi nanti.",
  ERROR_STICKER: "❌ Gagal membuat stiker. Silakan coba lagi nanti.",
  ERROR_STICKER_EMPTY: "Kirim teks setelah /stiker!",
  ERROR_DOWNLOAD: "⚠️ Gagal ambil file. Coba cek link-nya lagi.",
  ERROR_DOWNLOAD_PROCESS: "🚨 Ada error pas ngambil file!",
  ERROR_IMAGE_INVALID: "❌ Gagal mengirim gambar. URL tidak valid.",

  // Rate Limiting
  RATE_LIMIT_REACHED: (limit: number) => `Limit /stiker tercapai! (maks ${limit}) \nSilakan coba lagi nanti.`,

  // Sticker
  STICKER_CREATING: "sedang membuat stiker...",

  // Reminder
  REMINDER_SET: (time: string, message: string) => `⏰ Siap! Gue bakal ingetin jam ${time} buat: "${message}"`,
  REMINDER_TRIGGER: (message: string) => `🔔 Pengingat: ${message}`,
  GOOD_MORNING: "Selamat pagi! Jangan lupa sarapan 🍳",

  // Download
  DOWNLOAD_SELECT_SOURCE: "Pilih sumber download ⬇️",
  DOWNLOAD_SELECT_FORMAT: (source: string) => `Sumber: ${source.toUpperCase()}\nSekarang pilih format`,
  DOWNLOAD_SEND_LINK: (format: string) => `✅ Format: ${format.toUpperCase()}\nSekarang kirim link-nya 🔗`,
  DOWNLOAD_PROCESSING: "⏳ Sedang proses, tunggu bentar ya...",
  DOWNLOAD_VIDEO_CAPTION: "📽️ Nih videonya",
  DOWNLOAD_AUDIO_CAPTION: "🎧 Nih audionya",

  // Random replies for insults/gibberish
  RANDOM_REPLIES: ["apalah", "apa coba"],

  // Help text
  HELP_TEXT: `/gempa - Berita Gempa Terbaru \n
/berita - Berita Terkini \n
/quote - Quote of the day \n
/cuaca - Cek Cuaca \n(Gunakan Format /cuaca <nama kota>) \nContoh: /cuaca Malang \n
/sholat - Jadwal Sholat \n(Gunakan Format /sholat <nama kota>) \nContoh: /sholat Malang \n
/anime - Cari Anime \n(Gunakan Format /anime <nama anime>) \nContoh: /anime One Piece \n
/lirik - Cari Lirik Lagu \n(Gunakan Format /lirik <penyanyi> - <judul>) \nContoh: /lirik Neigbourhood - Sweater Weather \n
/film - Cari Film \n(Gunakan Format /film <judul film>) \nContoh: /film Avengers \n
/download - Download Video/Audio \n(Youtube / TikTok) \n
/stiker - Buat Stiker dari Teks \n(Gunakan Format /stiker <teks>) \nContoh: /stiker Halo! \nExperimental Feature! \n
/ingatkan - Set Pengingat \n(Gunakan Format /ingatkan <jam> <pesan>) \nContoh: /ingatkan 12:00 Makan Siang \nExperimental Feature!`,
} as const;

/** Insult words for random reply detection */
export const INSULT_WORDS = [
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
  "dongo",
  "dongok"
] as const;
