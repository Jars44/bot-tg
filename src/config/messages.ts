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
  ERROR_LYRICS_FORMAT: "Format salah! Contoh: /lirik Lana Del Rey - Brooklyn Baby",
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
  STICKER_CREATING: "Sedang membuat stiker...",

  // Reminder
  REMINDER_SET: (time: string, message: string) => `⏰ Siap! Gua bakal ingetin jam ${time} buat: "${message}"`,
  REMINDER_TRIGGER: (message: string) => `🔔 Pengingat: ${message}`,
  GOOD_MORNING: "Selamat pagi! Jangan lupa sarapan 🍳",

  // Download
  DOWNLOAD_SELECT_SOURCE: "Pilih sumber download ⬇️",
  DOWNLOAD_SELECT_FORMAT: (source: string) => `Sumber: ${source.toUpperCase()}\nSekarang pilih format`,
  DOWNLOAD_SEND_LINK: (format: string) => `✅ Format: ${format.toUpperCase()}\nSekarang kirim link-nya 🔗`,
  DOWNLOAD_PROCESSING: "⏳ Sedang proses, tunggu bentar ya...",
  DOWNLOAD_VIDEO_CAPTION: "📽️ Nih videonya",
  DOWNLOAD_AUDIO_CAPTION: "🎧 Nih audionya",

  // Help text
  HELP_TEXT: `📖 Panduan Perintah Bot

🏠 Navigasi Utama
/menu - Pusat navigasi utama untuk melihat semua fitur bot
/chart - Melihat grafik candlestick aset crypto/forex secara visual
/portfolio - Mengecek saldo, aset yang dimiliki, dan profit/loss terkini

🕌 Ibadah & Lokasi
/sholat - Mengecek jadwal sholat harian sesuai lokasi pengguna
/cuaca - Info cuaca terkini dan prediksi hari ini

💰 Finansial & Trading
/market - Market Hub: Dashboard aset dengan chart, sentimen, dan aksi trading
/catat - Mencatat pengeluaran harian untuk tracking keuangan pribadi
/buy - Melakukan simulasi pembelian aset (crypto/saham/forex)
/sell - Melakukan simulasi penjualan aset untuk mengambil profit
/alert - Memasang alarm notifikasi jika harga aset menyentuh target
/risk - Kalkulator manajemen risiko sebelum entry trading
/rekap - Melihat ringkasan total pengeluaran keuangan
/laporan - Laporan keuangan mendetail (biasanya dicek bulanan)

🎯 Utilitas
/ingatkan - Membuat pengingat waktu personal (alarm sederhana)
/stiker - Membuat stiker Telegram instan dari teks yang dikirim
/quote - Mendapatkan kutipan kata-kata bijak acak
/gempa - Informasi gempa bumi terkini dari BMKG

🎬 Hiburan
/anime - Mencari informasi dan sinopsis anime
/lirik - Mencari teks lirik lagu lengkap

🧪 Experimental (Butuh API/Tidak Stabil)
/download - Unduh video TikTok/YouTube (Sering tidak stabil)
/film - Cari info film (Butuh TMDB_API_KEY)
/berita - Berita terkini (Butuh GNEWS_API_TOKEN)
/sentimen - Analisis sentimen pasar
/calendar - Kalender ekonomi`,
} as const;
