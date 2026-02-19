# 1. Gunakan official image dari Bun (Cepat & Ringan)
FROM oven/bun:1 as base

# 2. Set folder kerja di dalam container
WORKDIR /app

# 3. Install Python3 (Wajib untuk youtube-dl-exec)
# Kita bersihkan cache apt setelah install agar ukuran image tetap kecil
RUN apt-get update && \
    apt-get install -y python3 && \
    rm -rf /var/lib/apt/lists/*

# 4. Copy file list dependency terlebih dahulu
# (Ini trik agar Docker melakukan cache, jadi kalau cuma ganti kodingan, gak perlu download ulang library)
COPY package.json bun.lock* ./

# 5. Install semua dependencies
RUN bun install

# 6. Copy seluruh file kode (src, dll) ke dalam container
COPY . .

# 7. Build TypeScript menjadi JavaScript
# (Pastikan di package.json kamu ada script: "build": "tsc" atau sejenisnya)
RUN bun run build

# 8. Set environment mode ke production
ENV NODE_ENV=production

# 9. Perintah untuk menyalakan bot
CMD ["bun", "run", "start"]