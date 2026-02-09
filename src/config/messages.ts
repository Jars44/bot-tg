/**
 * All user-facing message strings (Indonesian)
 * Centralized for easy modification and localization
 * Tone: Professional Hybrid (Clean, Trustworthy, Modern)
 */

export const MESSAGES = {
  // General
  WELCOME: "Selamat datang di @Jars44_Bot\nAkses menu utama dengan /menu atau /help untuk panduan.",
  GOODBYE: "Sesi diakhiri. \nGunakan /start untuk memulai kembali.",
  UNKNOWN_COMMAND: "Perintah tidak dikenali. \nGunakan /help untuk daftar perintah.",
  INVALID_FORMAT: "Format perintah tidak valid. \nGunakan /help untuk panduan.",

  // Search states
  SEARCHING: (topic: string) => `⏳ Mencari ${topic}...`,
  SEARCHING_EARTHQUAKE: "⏳ Mengambil data gempa...",
  SEARCHING_LYRICS: (title: string, artist: string) => `⏳ Mencari lirik: ${title} - ${artist}...`,
  SEARCHING_ANIME: (keyword: string) => `⏳ Mencari data anime: ${keyword}...`,
  SEARCHING_WEATHER: (location: string) => `⏳ Mengambil data cuaca: ${location}...`,
  SEARCHING_NEWS: "⏳ Mengambil berita terkini...",
  SEARCHING_PRAYER: (city: string) => `⏳ Mengambil jadwal sholat: ${city}...`,
  SEARCHING_MOVIE: (keyword: string) => `⏳ Mencari database film: ${keyword}...`,
  SEARCHING_QUOTE: "⏳ Mengambil kutipan...",

  // Errors
  ERROR_GENERIC: "⚠️ Terjadi kesalahan sistem. Silakan coba lagi.",
  ERROR_EARTHQUAKE: "⚠️ Gagal mengambil data gempa.",
  ERROR_LYRICS: (title: string, artist: string) => `⚠️ Lirik tidak ditemukan: ${title} - ${artist}`,
  ERROR_LYRICS_FORMAT: "⚠️ Format salah. Gunakan: /lirik Artist - Title",
  ERROR_QUOTE: "⚠️ Gagal mengambil kutipan.",
  ERROR_ANIME: "⚠️ Data anime tidak ditemukan.",
  ERROR_WEATHER: "⚠️ Gagal mengambil data cuaca.",
  ERROR_LOCATION_NOT_FOUND: (location: string) => `⚠️ Lokasi tidak ditemukan: ${location}`,
  ERROR_NEWS: "⚠️ Gagal mengambil berita.",
  ERROR_PRAYER: (city: string) => `⚠️ Data sholat tidak tersedia untuk: ${city}`,
  ERROR_PRAYER_INVALID: "⚠️ Format data tidak valid.",
  ERROR_MOVIE: "⚠️ Film tidak ditemukan.",
  ERROR_STICKER: "⚠️ Gagal memproses stiker.",
  ERROR_STICKER_EMPTY: "⚠️ Sertakan teks atau gambar setelah perintah /stiker",
  ERROR_DOWNLOAD: "⚠️ Link tidak valid atau konten tidak tersedia.",
  ERROR_DOWNLOAD_PROCESS: "⚠️ Gagal memproses unduhan.",
  ERROR_IMAGE_INVALID: "⚠️ URL gambar tidak valid.",

  // Rate Limiting
  RATE_LIMIT_REACHED: (limit: number) => `⚠️ Batas penggunaan tercapai (Maks: ${limit}). Coba lagi nanti.`,

  // Sticker
  STICKER_CREATING: "⏳ Memproses stiker...",

  // Reminder
  REMINDER_SET: (time: string, message: string) => `✅ Pengingat diset untuk ${time}\nPesan: "${message}"`,
  REMINDER_TRIGGER: (message: string) => `🔔 PENGINGAT: ${message}`,
  GOOD_MORNING: "Selamat pagi. Jangan lupa sarapan.",

  // Download
  DOWNLOAD_SELECT_SOURCE: "Pilih sumber:",
  DOWNLOAD_SELECT_FORMAT: (source: string) => `Sumber: ${source.toUpperCase()} | Pilih format:`,
  DOWNLOAD_SEND_LINK: (format: string) => `Format: ${format.toUpperCase()} | Kirim link URL:`,
  DOWNLOAD_PROCESSING: "⏳ Memproses permintaan...",
  DOWNLOAD_VIDEO_CAPTION: "✅ Video berhasil diproses.",
  DOWNLOAD_AUDIO_CAPTION: "✅ Audio berhasil diproses.",

  // Help text
  HELP_TEXT: `📖 *Panduan Bot*
  
🟢 *Fitur Utama (Stabil)*
---------------------------
/catat - Catat Keuangan
/rekap - Laporan Keuangan
/portfolio - Cek Aset Trading
/sholat [kota] - Jadwal Sholat
/stiker - Buat Stiker
/quote - Kutipan Bijak
/ingatkan - Set Pengingat

🧪 *Fitur Eksperimental (Beta)*
---------------------------
_Fitur ini bergantung pada layanan pihak ketiga dan mungkin tidak stabil._

/berita - Berita Terkini (GNews)
/cuaca [kota] - Info Cuaca
/anime [judul] - Info Anime
/film [judul] - Info Film
/lirik [lagu] - Cari Lirik
/download [url] - Unduh Sosmed
/gempa - Info Gempa BMKG

⚙️ *System*
/menu - Dashboard Utama
/help - Tampilkan Pesan Ini
/start - Restart Sesi
/stop - Akhiri Sesi`,
} as const;
