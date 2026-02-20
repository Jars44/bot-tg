# 1. Gunakan official image dari Bun (Cepat & Ringan)
FROM oven/bun:1 as builder

# 2. Set folder kerja di dalam container
WORKDIR /app

# 3. Install Python3 (Wajib untuk youtube-dl-exec) dan curl untuk health check
RUN apt-get update && \
    apt-get install -y python3 curl build-essential && \
    rm -rf /var/lib/apt/lists/*

# 4. Copy file list dependency terlebih dahulu
# (Ini trik agar Docker melakukan cache, jadi kalau cuma ganti kodingan, gak perlu download ulang library)
COPY package.json bun.lock* ./

# 5. Install semua dependencies
RUN bun install

# 6. Copy seluruh file kode (src, dll) ke dalam container
COPY . .

# 7. Build TypeScript menjadi JavaScript
RUN bun run build

# ============================================
# Production stage - lebih ringan
# ============================================
FROM oven/bun:1

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y python3 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy compiled app dan dependencies dari builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# 8. Set environment mode ke production
ENV NODE_ENV=production
ENV PORT=7860

# 9. Expose port yang digunakan
EXPOSE 7860

# Health check - Telegram webhook mode requires quick startup
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
CMD curl -f http://localhost:7860/ || exit 1

# 10. Perintah untuk menyalakan bot (webhook mode)
CMD ["bun", "run", "start"]