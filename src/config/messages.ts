import { escapeMarkdown } from "../utils/sanitize.js";
import { toTitleCase } from "../utils/helpers.js";
import { S } from "./symbols.js";

export const MESSAGES = {
  WELCOME: "Jarvis Bot\nAkses menu utama dengan /menu atau /help untuk panduan.",
  GOODBYE: "Sesi diakhiri.\nGunakan /start untuk memulai kembali.",
  UNKNOWN_COMMAND: "Perintah tidak dikenali.\nGunakan /help untuk daftar perintah.",
  INCOMPLETE_COMMAND: (cmd: string) =>
    `${S.FAIL} Perintah /${cmd} tidak lengkap.\nGunakan /help untuk melihat format perintah yang benar.`,
  INVALID_FORMAT: "Format perintah tidak valid.\nGunakan /help untuk panduan.",

  SEARCHING: (topic: string) => `${S.LOADING} Mencari ${topic}...`,
  SEARCHING_EARTHQUAKE: `${S.LOADING} Mengambil data gempa...`,
  SEARCHING_LYRICS: (title: string, artist: string) =>
    `${S.LOADING} Mencari lirik: ${toTitleCase(title)} - ${toTitleCase(artist)}...`,
  SEARCHING_ANIME: (keyword: string) => `${S.LOADING} Mencari data anime: ${toTitleCase(keyword)}...`,
  SEARCHING_WEATHER: (location: string) => `${S.LOADING} Mengambil data cuaca: ${toTitleCase(location)}...`,
  SEARCHING_NEWS: `${S.LOADING} Mengambil berita terkini...`,
  SEARCHING_PRAYER: (city: string) => `${S.LOADING} Mengambil jadwal sholat: ${toTitleCase(city)}...`,
  SEARCHING_MOVIE: (keyword: string) => `${S.LOADING} Mencari data film: ${toTitleCase(keyword)}...`,
  SEARCHING_QUOTE: `${S.LOADING} Mengambil kutipan...`,

  ERROR_GENERIC: `${S.FAIL} Terjadi kesalahan sistem. Silakan coba lagi.`,
  ERROR_EARTHQUAKE: `${S.FAIL} Gagal mengambil data gempa.`,
  ERROR_LYRICS: (title: string, artist: string) =>
    `${S.FAIL} Lirik tidak ditemukan: ${toTitleCase(title)} - ${toTitleCase(artist)}`,
  ERROR_LYRICS_FORMAT: `${S.FAIL} Format salah. Gunakan: /lirik Artist - Title`,
  ERROR_QUOTE: `${S.FAIL} Gagal mengambil kutipan.`,
  ERROR_ANIME: `${S.FAIL} Data anime tidak ditemukan.`,
  ERROR_WEATHER: `${S.FAIL} Gagal mengambil data cuaca.`,
  ERROR_LOCATION_NOT_FOUND: (location: string) => `${S.FAIL} Lokasi tidak ditemukan: ${toTitleCase(location)}`,
  ERROR_NEWS: `${S.FAIL} Gagal mengambil berita.`,
  ERROR_PRAYER: (city: string) => `${S.FAIL} Data sholat tidak tersedia untuk: ${toTitleCase(city)}`,
  ERROR_PRAYER_INVALID: `${S.FAIL} Format data tidak valid.`,
  ERROR_MOVIE: `${S.FAIL} Film tidak ditemukan.`,
  ERROR_STICKER: `${S.FAIL} Gagal memproses stiker.`,
  ERROR_STICKER_EMPTY: `${S.FAIL} Sertakan teks atau gambar setelah perintah /stiker`,
  ERROR_DOWNLOAD: `${S.FAIL} Link tidak valid atau konten tidak tersedia.`,
  ERROR_DOWNLOAD_PROCESS: `${S.FAIL} Gagal memproses unduhan.`,
  ERROR_IMAGE_INVALID: `${S.FAIL} URL gambar tidak valid.`,

  RATE_LIMIT_REACHED: (limit: number) => `${S.WARN} Batas penggunaan tercapai (Maks: ${limit}). Coba lagi nanti.`,

  STICKER_CREATING: `${S.LOADING} Memproses stiker...`,
  STICKER_MENU: "*Pilih Jenis Stiker*\n\nPilih tipe stiker yang ingin Anda buat:",
  STICKER_IMAGE_PROMPT: `*Stiker dari Gambar*

Silakan kirim gambar yang ingin dijadikan stiker.

*Tips:*
${S.BULLET} Gunakan format **PNG** dengan background transparan untuk hasil terbaik
${S.BULLET} Jika Anda mengirim **JPG**, stiker akan berbentuk kotak dengan background solid
${S.BULLET} Resolusi optimal: 512x512 piksel
${S.BULLET} Orientasi 1:1 lebih disarankan

_Gambar akan otomatis diproses dan diubah ke format WebP._`,
  STICKER_PROCESSING_IMAGE: `${S.LOADING} Memproses gambar menjadi stiker...`,

  REMINDER_SET: (time: string, message: string) => `${S.SUCCESS} Pengingat diset untuk ${time}\nPesan: "${message}"`,
  REMINDER_TRIGGER: (message: string) => `${S.BULLET} PENGINGAT: ${message}`,
  GOOD_MORNING: "Selamat pagi. Jangan lupa sarapan.",

  DOWNLOAD_SELECT_SOURCE: "Pilih sumber:",
  DOWNLOAD_SELECT_FORMAT: (source: string) => `Sumber: ${source.toUpperCase()} ${S.ARROW_R} Pilih format:`,
  DOWNLOAD_SEND_LINK: (format: string) => `Format: ${format.toUpperCase()} ${S.ARROW_R} Kirim link URL:`,
  DOWNLOAD_PROCESSING: `${S.LOADING} Memproses permintaan...`,
  DOWNLOAD_VIDEO_CAPTION: `${S.SUCCESS} Video berhasil diproses.`,
  DOWNLOAD_AUDIO_CAPTION: `${S.SUCCESS} Audio berhasil diproses.`,

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

  GUIDE_PROMPT_LYRICS: `${S.BULLET} Silakan ketik judul lagu dan artis yang ingin Anda cari (sesuai format di atas):`,
  GUIDE_PROMPT_MOVIE: `${S.BULLET} Silakan ketik judul film yang ingin Anda cari:`,
  GUIDE_PROMPT_ANIME: `${S.BULLET} Silakan ketik judul anime yang ingin Anda cari:`,
  GUIDE_PROMPT_CHART: `${S.BULLET} Silakan ketik simbol aset dan timeframe (contoh: BTC 1h):`,
  GUIDE_PROMPT_STICKER: `${S.BULLET} Silakan ketik teks yang ingin dijadikan stiker (maks 50 karakter):`,
  GUIDE_PROMPT_SENTIMENT: `${S.BULLET} Silakan ketik kata kunci berita yang ingin dianalisis (contoh: crypto):`,
  GUIDE_PROMPT_ALERT: `${S.BULLET} Silakan ketik simbol dan harga target (contoh: BTC 50000):`,
  GUIDE_PROMPT_REMINDER: `${S.BULLET} Silakan ketik waktu dan pesan pengingat (contoh: 07:00 Pagi):`,
  GUIDE_PROMPT_BUY: `${S.BULLET} Silakan ketik simbol aset yang ingin dibeli (contoh: BTC 1000):`,
  GUIDE_PROMPT_SELL: `${S.BULLET} Silakan ketik simbol aset yang ingin dijual (contoh: BTC 1000):`,

  HELP_TEXT: `*Panduan Perintah*

*Navigasi*
${S.BULLET} /menu ${S.DASH} Pusat navigasi utama
${S.BULLET} /chart ${S.DASH} Grafik candlestick crypto/forex
${S.BULLET} /portfolio ${S.DASH} Saldo, aset, dan profit/loss
${S.BULLET} /ai ${S.DASH} Mode percakapan AI
${S.BULLET} /help ${S.DASH} Bantuan

*Ibadah & Lokasi*
${S.BULLET} /sholat ${S.DASH} Jadwal sholat harian
${S.BULLET} /cuaca ${S.DASH} Info cuaca terkini

*Finansial & Trading*
${S.BULLET} /market ${S.DASH} Market Hub dashboard
${S.BULLET} /catat ${S.DASH} Catat pengeluaran harian
${S.BULLET} /buy ${S.DASH} Simulasi pembelian aset
${S.BULLET} /sell ${S.DASH} Simulasi penjualan aset
${S.BULLET} /calendar ${S.DASH} Kalender ekonomi
${S.BULLET} /risk ${S.DASH} Kalkulator manajemen risiko
${S.BULLET} /rekap ${S.DASH} Ringkasan pengeluaran
${S.BULLET} /laporan ${S.DASH} Laporan keuangan detail
${S.BULLET} /sentimen ${S.DASH} Analisis sentimen pasar

*Lifestyle*
${S.BULLET} /vibe ${S.DASH} Music & scent pairing dari lokasi
${S.BULLET} /moodboard ${S.DASH} Visual moodboard & color palette
${S.BULLET} /hunt ${S.DASH} Misi fotografi street photography
${S.BULLET} /brainstorm ${S.DASH} Generator ide kreatif
${S.BULLET} /idea ${S.DASH} Random creative idea seed
${S.BULLET} /lore ${S.DASH} Fragment lore fiksi

*Utilitas*
${S.BULLET} /stiker ${S.DASH} Buat stiker dari teks
${S.BULLET} /quote ${S.DASH} Kutipan kata bijak
${S.BULLET} /gempa ${S.DASH} Info gempa terkini BMKG
${S.BULLET} /berita ${S.DASH} Berita terkini

*Hiburan*
${S.BULLET} /anime ${S.DASH} Cari info anime
${S.BULLET} /lirik ${S.DASH} Cari lirik lagu
${S.BULLET} /film ${S.DASH} Cari info film
${S.BULLET} /geoguessr ${S.DASH} Tebak lokasi dari pin peta

*Eksperimental*
${S.BULLET} /download ${S.DASH} Unduh video/audio
${S.BULLET} /ingatkan ${S.DASH} Pengingat waktu
${S.BULLET} /alert ${S.DASH} Alarm harga aset`,

  CALENDAR_FETCHING: `${S.LOADING} Mengambil data economic calendar...`,
  CALENDAR_HIGH_IMPACT_FETCHING: `${S.LOADING} Mengambil high-impact events...`,
  CALENDAR_NO_EVENTS: "Tidak ada high-impact event hari ini.",
  CALENDAR_ERROR: `${S.FAIL} Gagal mengambil data calendar.`,

  SENTIMENT_FORMAT_ERROR: `${S.FAIL} Format salah.\nGunakan: \`/sentimen [keyword]\`\nContoh: \`/sentimen bitcoin\``,
  SENTIMENT_ANALYZING: (keyword: string) => `${S.LOADING} Menganalisis sentimen untuk "${toTitleCase(keyword)}"...`,
  SENTIMENT_ERROR: `${S.FAIL} Gagal menganalisis sentimen.`,

  ALERT_INVALID_PRICE: `${S.WARN} Harga tidak valid.`,
  ALERT_FETCH_ERROR: `${S.WARN} Gagal mengambil harga pasar.`,
  ALERT_NONE: "Belum ada alert aktif.",

  RISK_INVALID_INPUT: `${S.WARN} Input tidak valid. Masukkan angka positif.`,

  SMART_PASTE_CONFIRM: (url: string) => `${S.SUCCESS} Link terdeteksi. Pilih format untuk download:\n\n\`${escapeMarkdown(url)}\``,
  SMART_PASTE_SESSION_EXPIRED: `${S.LOADING} Sesi telah berakhir. Kirim ulang link untuk mencoba lagi.`,
  SMART_PASTE_CANCELLED: `${S.FAIL} Download dibatalkan.`,

  GUIDE_STICKER: `**Buat Stiker**

Membuat stiker Telegram instan dari teks.

**Gunakan:**
\`/stiker [teks]

**Contoh:**
\`/stiker Hello World!
\`/stiker Selamat Ulang Tahun
\`/stiker GOAL!!!

_Limit: {limit} stiker per hari._`,
  GUIDE_CHART: `**Grafik Candlestick**

Gunakan: \`/chart [symbol] [timeframe]\`

**Contoh:**
\`/chart BTC 1h\` ${S.DASH} Bitcoin 1 jam
\`/chart ETH 4h\` ${S.DASH} Ethereum 4 jam
\`/chart XAUUSD 1d\` ${S.DASH} Gold per hari

**Timeframes:**
${S.BULLET} \`1m\` ${S.DASH} 1 menit
${S.BULLET} \`5m\` ${S.DASH} 5 menit
${S.BULLET} \`15m\` ${S.DASH} 15 menit
${S.BULLET} \`1h\` ${S.DASH} 1 jam
${S.BULLET} \`4h\` ${S.DASH} 4 jam
${S.BULLET} \`1d\` ${S.DASH} 1 hari`,

  GUIDE_SENTIMENT: `**Analisis Sentimen**

Analisis sentimen pasar berdasarkan berita.

**Gunakan:**
\`/sentimen [keyword]\`

**Contoh:**
\`/sentimen bitcoin\`
\`/sentimen ethereum\`
\`/sentimen crypto\`
\`/sentimen forex\`

_Menggunakan keyword scoring dari headline berita._`,

  GUIDE_ALERT: `**Alert Harga Aset**

Atur notifikasi ketika harga mencapai target.

**Gunakan:**
\`/alert [Symbol] [Harga]\`

**Contoh:**
\`/alert BTC 50000\`
\`/alert ETH 3000\``,

  GUIDE_REMINDER: `**Pengingat Waktu**

Buat pengingat personal yang dikirimkan pada jam tertentu.

**Gunakan:**
\`/ingatkan [HH:MM] [pesan]\`

**Contoh:**
\`/ingatkan 12:00 Makan siang\`
\`/ingatkan 08:30 Meeting pagi\`
\`/ingatkan 17:00 Pulang kerja\`

_Format: 24 jam (14:30 = jam 2:30 siang)_`,

  GUIDE_ANIME: `**Cari Anime**

Informasi dan sinopsis dari MyAnimeList.

**Gunakan:**
\`/anime [judul]\`

**Contoh:**
\`/anime Naruto\`
\`/anime Attack on Titan\`
\`/anime One Piece\`
\`/anime Jujutsu Kaisen\``,

  GEOGUESSR_SEARCHING: `${S.LOADING} Mencari lokasi misterius...`,
  GEOGUESSR_PROMPT:
    `${S.PIN} **Tebak Lokasi**\n\nLihat pin di atas. Balas pesan ini dengan nama *Negara*, *Provinsi*, atau *Kota* dari lokasi tersebut.\n\n_Ketik /nyerah untuk menyerah._`,
  GEOGUESSR_CORRECT_CITY: (city: string, country: string, points: number) =>
    `${S.SUCCESS} **Tepat sekali!**\n\nLokasi: *${escapeMarkdown(toTitleCase(city))}, ${escapeMarkdown(toTitleCase(country))}*\n+${points} poin`,
  GEOGUESSR_CORRECT_STATE: (state: string, country: string, points: number) =>
    `${S.SUCCESS} **Benar!**\n\nProvinsi/Negara bagian: *${escapeMarkdown(toTitleCase(state))}, ${escapeMarkdown(toTitleCase(country))}*\n+${points} poin`,
  GEOGUESSR_CORRECT_COUNTRY: (country: string, points: number) =>
    `${S.SUCCESS} **Hampir!**\n\nNegara: *${escapeMarkdown(toTitleCase(country))}*\n+${points} poin`,
  GEOGUESSR_WRONG: (attempts: number) =>
    `${S.FAIL} **Kurang tepat!**\n\nPercobaan ke-${attempts}. Coba lagi atau ketik /nyerah.`,
  GEOGUESSR_GIVE_UP: (city: string | null, state: string | null, country: string, address: string) => {
    const location = city || state || country;
    return `**Menyerah**\n\nJawaban: *${escapeMarkdown(toTitleCase(location))}, ${escapeMarkdown(toTitleCase(country))}*\n\n_${escapeMarkdown(address)}_`;
  },
  GEOGUESSR_ERROR: `${S.FAIL} Gagal memproses permainan. Silakan coba lagi.`,
  GEOGUESSR_ERROR_LOCATION: `${S.FAIL} Gagal mendapatkan data lokasi. Silakan coba lagi.`,
  GEOGUESSR_ERROR_API: `${S.FAIL} Layanan lokasi tidak tersedia. Coba lagi nanti.`,
  GEOGUESSR_NO_ACTIVE_GAME: `${S.FAIL} Tidak ada permainan aktif. Gunakan /geoguessr untuk memulai.`,

  GUIDE_GEOGUESSR: `**Tebak Lokasi (GeoGuessr)**

Permainan tebak lokasi berdasarkan pin peta.

**Cara Bermain:**
1. Gunakan \`/geoguessr\` untuk memulai
2. Bot akan mengirim pin lokasi di peta
3. Balas dengan nama Negara, Provinsi, atau Kota
4. Ketik \`/nyerah\` untuk menyerah

**Poin:**
${S.BULLET} Tebak Kota tepat: +10 poin
${S.BULLET} Tebak Provinsi: +5 poin
${S.BULLET} Tebak Negara: +2 poin

_Lokasi random: 60% Indonesia, 40% dunia._`,

  AI_MODE_ACTIVATED:
    `**Mode AI Aktif**\n\nSilakan tanya apa saja. Jarvis akan membalas sebagai asisten AI.\n\n_Ketik /exit untuk kembali ke menu utama._`,
  AI_MODE_DEACTIVATED: "**Mode AI dinonaktifkan**\n\nKembali ke sistem utama.",
  AI_NO_ACTIVE_SESSION: `${S.FAIL} Tidak ada sesi AI aktif.`,
  AI_ERROR: `${S.FAIL} Gagal mendapatkan respons AI. Silakan coba lagi.`,
  AI_ERROR_QUOTA: `${S.FAIL} Kuota API AI habis. Coba lagi nanti.`,
  AI_ERROR_SETUP: `${S.FAIL} Konfigurasi AI tidak valid. Hubungi administrator.`,
  AI_THINKING: `${S.LOADING} Berpikir...`,
  AI_ACTIVATE_ERROR: `${S.FAIL} Gagal mengaktifkan mode AI. Silakan coba lagi.`,

  GUIDE_AI: `**Mode AI Chat**

Percakapan dengan asisten AI menggunakan Google Gemini.

**Cara Menggunakan:**
1. Gunakan \`/ai\` atau \`/chat\` untuk memulai
2. Kirim pesan apa saja untuk berdiskusi
3. Bot akan menjaga konteks percakapan
4. Ketik \`/exit\` untuk keluar

**Fitur:**
${S.BULLET} Memahami konteks percakapan
${S.BULLET} Menjawab dalam Bahasa Indonesia atau Inggris
${S.BULLET} Dapat membantu berbagai topik

_Riwayat percakapan disimpan selama sesi aktif._`,
} as const;
