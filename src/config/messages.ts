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

  // Guides (Clean Minimalist)
  GUIDE_LYRICS: `**Cari Lirik Lagu**

Mencari teks lirik lengkap dari berbagai sumber.

**Penggunaan Manual:**
\`/lirik [Artis] - [Judul]\`

**Contoh:**
\`/lirik Coldplay - Yellow\`
\`/lirik Taylor Swift - Anti Hero\`

Pastikan gunakan tanda strip (-) antara artis dan judul.`,

  GUIDE_MOVIE: `**Cari Info Film**

Mencari rating, sinopsis, dan info rilis film.

**Penggunaan Manual:**
\`/film [Judul Film]\`

**Contoh:**
\`/film Avengers\`
\`/film Interstellar\`
\`/film The Dark Knight\``,

  // Guide Prompts
  GUIDE_PROMPT_LYRICS: "» Silakan ketik judul lagu dan artis yang ingin Anda cari (sesuai format di atas):",
  GUIDE_PROMPT_MOVIE: "» Silakan ketik judul film yang ingin Anda cari:",
  GUIDE_PROMPT_ANIME: "» Silakan ketik judul anime yang ingin Anda cari:",
  GUIDE_PROMPT_CHART: "» Silakan ketik simbol aset dan timeframe (contoh: BTC 1h):",
  GUIDE_PROMPT_STICKER: "» Silakan ketik teks yang ingin dijadikan stiker (maks 50 karakter):",
  GUIDE_PROMPT_SENTIMENT: "» Silakan ketik kata kunci berita yang ingin dianalisis (contoh: crypto):",
  GUIDE_PROMPT_ALERT: "» Silakan ketik simbol dan harga target (contoh: BTC 50000):",
  GUIDE_PROMPT_REMINDER: "» Silakan ketik waktu dan pesan pengingat (contoh: 07:00 Pagi):",
  GUIDE_PROMPT_BUY: "» Silakan ketik simbol aset yang ingin dibeli (contoh: BTC 1000):",
  GUIDE_PROMPT_SELL: "» Silakan ketik simbol aset yang ingin dijual (contoh: BTC 1000):",

  // Help text
  HELP_TEXT: `*Panduan Perintah*

*Navigasi*
• /menu — Pusat navigasi utama
• /chart — Grafik candlestick crypto/forex
• /portfolio — Saldo, aset, dan profit/loss
• /help — Bantuan

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
• /sentimen — Analisis sentimen pasar

*Utilitas*
• /stiker — Buat stiker dari teks
• /quote — Kutipan kata bijak
• /gempa — Info gempa terkini BMKG
• /berita — Berita terkini

*Hiburan*
• /anime — Cari info anime
• /lirik — Cari lirik lagu
• /film — Cari info film

*Eksperimental*
• /download — Unduh video/audio
• /ingatkan — Pengingat waktu
• /alert — Alarm harga aset`,

  // Calendar
  CALENDAR_FETCHING: "⧗ Mengambil data economic calendar...",
  CALENDAR_HIGH_IMPACT_FETCHING: "⧗ Mengambil high-impact events...",
  CALENDAR_NO_EVENTS: "Tidak ada high-impact event hari ini.",
  CALENDAR_ERROR: "× Gagal mengambil data calendar.",

  // Sentiment
  SENTIMENT_FORMAT_ERROR: "× Format salah.\nGunakan: `/sentimen [keyword]`\nContoh: `/sentimen bitcoin`",
  SENTIMENT_ANALYZING: (keyword: string) => `⧗ Menganalisis sentimen untuk "${keyword}"...`,
  SENTIMENT_ERROR: "× Gagal menganalisis sentimen.",

  // Alert
  ALERT_INVALID_PRICE: "⚠︎ Harga tidak valid.",
  ALERT_FETCH_ERROR: "⚠︎ Gagal mengambil harga pasar.",
  ALERT_NONE: "Belum ada alert aktif.",

  // Risk
  RISK_INVALID_INPUT: "⚠︎ Input tidak valid. Masukkan angka positif.",
  // Smart Paste
  SMART_PASTE_CONFIRM: (url: string) => `🔗 Link terdeteksi, ingin download?\n\n\`${url}\``,
  SMART_PASTE_SESSION_EXPIRED: "⏳ Sesi telah berakhir. Kirim ulang link untuk mencoba lagi.",
  SMART_PASTE_CANCELLED: "❌ Download dibatalkan.",

  // Sticker Guide
  GUIDE_STICKER: `**Buat Stiker**

Membuat stiker Telegram instan dari teks yang kamu kirim.

**Penggunaan Manual:**
\`/stiker [teks]\`

**Contoh:**
\`/stiker Hello World!\`
\`/stiker Selamat Ulang Tahun\`
\`/stiker GOAL!!!\`

_Limit: {limit} stiker per hari._`,
  // Guides
  GUIDE_CHART: `📊 *Technical Chart*

Gunakan: \`/chart [symbol] [timeframe]\`

*Contoh:*
\`/chart BTC 1h\` - Bitcoin 1 jam
\`/chart ETH 4h\` - Ethereum 4 jam
\`/chart XAUUSD 1d\` - Gold harian

*Timeframes:*
• \`1m\` - 1 menit
• \`5m\` - 5 menit
• \`15m\` - 15 menit
• \`1h\` - 1 jam
• \`4h\` - 4 jam
• \`1d\` - 1 hari`,

  GUIDE_SENTIMENT: `*Sentiment Analysis*

Analisis sentimen pasar berdasarkan berita terkini.

*Format:*
\`/sentimen [keyword]\`

*Contoh:*
\`/sentimen bitcoin\`
\`/sentimen ethereum\`
\`/sentimen crypto\`
\`/sentimen forex\`

_Analisis menggunakan keyword scoring dari headline berita._`,

  GUIDE_ALERT: `*Price Alert*

Set notifikasi harga aset.
Format: \`/alert [Symbol] [Price]\`

Contoh:
\`/alert BTC 50000\`
\`/alert ETH 3000\``,

  GUIDE_REMINDER: `*Pengingat Waktu*

Membuat pengingat waktu personal yang akan dikirimkan pada jam yang ditentukan.

*Gunakan:* \`/ingatkan [HH:MM] [pesan]\`

*Contoh:*
\`/ingatkan 12:00 Makan siang\`
\`/ingatkan 08:30 Meeting pagi\`
\`/ingatkan 17:00 Pulang kerja\`

_Format waktu: 24 jam (contoh: 14:30 untuk jam 2:30 siang)_`,

  GUIDE_ANIME: `*Cari Anime*

Mencari informasi dan sinopsis anime dari MyAnimeList.

*Gunakan:* \`/anime [judul anime]\`

*Contoh:*
\`/anime Naruto\`
\`/anime Attack on Titan\`
\`/anime One Piece\`
\`/anime Jujutsu Kaisen\`

_Hasil pencarian akan menampilkan daftar pilihan jika ada lebih dari satu hasil._`,
} as const;
