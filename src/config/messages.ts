/**
 * All user-facing message strings (Indonesian)
 * Centralized for easy modification and localization
 * Tone: Direct, Neutral, Precise — Monochrome Minimalist
 */

export const MESSAGES = {
  // General
  WELCOME: "Jarvis Bot\nAkses menu utama dengan /menu atau /help untuk panduan.",
  GOODBYE: "Sesi diakhiri.\nGunakan /start untuk memulai kembali.",
  UNKNOWN_COMMAND: "Perintah tidak dikenali.\nGunakan /help untuk daftar perintah.",
  INVALID_FORMAT: "Format perintah tidak valid.\nGunakan /help untuk panduan.",

  // Search states
  SEARCHING: (topic: string) => `⧗ Mencari ${topic}...`,
  SEARCHING_EARTHQUAKE: "⧗ Mengambil data gempa...",
  SEARCHING_LYRICS: (title: string, artist: string) => `⧗ Mencari lirik: ${title} - ${artist}...`,
  SEARCHING_ANIME: (keyword: string) => `⧗ Mencari data anime: ${keyword}...`,
  SEARCHING_WEATHER: (location: string) => `⧗ Mengambil data cuaca: ${location}...`,
  SEARCHING_NEWS: "⧗ Mengambil berita terkini...",
  SEARCHING_PRAYER: (city: string) => `⧗ Mengambil jadwal sholat: ${city}...`,
  SEARCHING_MOVIE: (keyword: string) => `⧗ Mencari database film: ${keyword}...`,
  SEARCHING_QUOTE: "⧗ Mengambil kutipan...",

  // Errors
  ERROR_GENERIC: "× Terjadi kesalahan sistem. Silakan coba lagi.",
  ERROR_EARTHQUAKE: "× Gagal mengambil data gempa.",
  ERROR_LYRICS: (title: string, artist: string) => `× Lirik tidak ditemukan: ${title} - ${artist}`,
  ERROR_LYRICS_FORMAT: "× Format salah. Gunakan: /lirik Artist - Title",
  ERROR_QUOTE: "× Gagal mengambil kutipan.",
  ERROR_ANIME: "× Data anime tidak ditemukan.",
  ERROR_WEATHER: "× Gagal mengambil data cuaca.",
  ERROR_LOCATION_NOT_FOUND: (location: string) => `× Lokasi tidak ditemukan: ${location}`,
  ERROR_NEWS: "× Gagal mengambil berita.",
  ERROR_PRAYER: (city: string) => `× Data sholat tidak tersedia untuk: ${city}`,
  ERROR_PRAYER_INVALID: "× Format data tidak valid.",
  ERROR_MOVIE: "× Film tidak ditemukan.",
  ERROR_STICKER: "× Gagal memproses stiker.",
  ERROR_STICKER_EMPTY: "× Sertakan teks atau gambar setelah perintah /stiker",
  ERROR_DOWNLOAD: "× Link tidak valid atau konten tidak tersedia.",
  ERROR_DOWNLOAD_PROCESS: "× Gagal memproses unduhan.",
  ERROR_IMAGE_INVALID: "× URL gambar tidak valid.",

  // Rate Limiting
  RATE_LIMIT_REACHED: (limit: number) => `⚠︎ Batas penggunaan tercapai (Maks: ${limit}). Coba lagi nanti.`,

  // Sticker
  STICKER_CREATING: "⧗ Memproses stiker...",

  // Reminder
  REMINDER_SET: (time: string, message: string) => `✓ Pengingat diset untuk ${time}\nPesan: "${message}"`,
  REMINDER_TRIGGER: (message: string) => `» PENGINGAT: ${message}`,
  GOOD_MORNING: "Selamat pagi. Jangan lupa sarapan.",

  // Download
  DOWNLOAD_SELECT_SOURCE: "Pilih sumber:",
  DOWNLOAD_SELECT_FORMAT: (source: string) => `Sumber: ${source.toUpperCase()} → Pilih format:`,
  DOWNLOAD_SEND_LINK: (format: string) => `Format: ${format.toUpperCase()} → Kirim link URL:`,
  DOWNLOAD_PROCESSING: "⧗ Memproses permintaan...",
  DOWNLOAD_VIDEO_CAPTION: "✓ Video berhasil diproses.",
  DOWNLOAD_AUDIO_CAPTION: "✓ Audio berhasil diproses.",

  // Help text
  HELP_TEXT: `*Panduan Perintah*

*Navigasi*
• /menu — Pusat navigasi utama
• /chart — Grafik candlestick crypto/forex
• /portfolio — Saldo, aset, dan profit/loss

*Ibadah & Lokasi*
• /sholat — Jadwal sholat harian
• /cuaca — Info cuaca terkini

*Finansial & Trading*
• /market — Market Hub dashboard
• /catat — Catat pengeluaran harian
• /buy — Simulasi pembelian aset
• /sell — Simulasi penjualan aset
• /calendar — Kalender ekonomi
• /risk — Kalkulator manajemen risiko
• /rekap — Ringkasan pengeluaran
• /laporan — Laporan keuangan detail

*Utilitas*
• /stiker — Buat stiker dari teks
• /quote — Kutipan kata bijak
• /gempa — Info gempa terkini BMKG

*Hiburan*
• /anime — Cari info anime
• /lirik — Cari lirik lagu

*Eksperimental*
• /download — Unduh video/audio
• /ingatkan — Pengingat waktu
• /alert — Alarm harga aset
• /film — Cari info film
• /berita — Berita terkini
• /sentimen — Analisis sentimen pasar`,
} as const;
