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
/calendar - Kalender ekonomi
/risk - Kalkulator manajemen risiko sebelum entry trading
/rekap - Melihat ringkasan total pengeluaran keuangan
/laporan - Laporan keuangan mendetail (biasanya dicek bulanan)

🎯 Utilitas
/stiker - Membuat stiker Telegram instan dari teks yang dikirim
/quote - Mendapatkan kutipan kata-kata bijak acak
/gempa - Informasi gempa bumi terkini dari BMKG

🎬 Hiburan
/anime - Mencari informasi dan sinopsis anime
/lirik - Mencari teks lirik lagu lengkap

🧪 Experimental (Butuh API/Tidak Stabil)
/download - Unduh video/audio (Sering tidak stabil)
/ingatkan - Membuat pengingat waktu personal (alarm sederhana)
/alert - Memasang alarm notifikasi jika harga aset menyentuh target
/film - Cari info film (Butuh TMDB_API_KEY)
/berita - Berita terkini (Butuh GNEWS_API_TOKEN)
/sentimen - Analisis sentimen pasar`,
} as const;
