import { S, separator } from "../config/symbols.js";

export class ResponseBuilder {
  private lines: string[] = [];

  static create(): ResponseBuilder {
    return new ResponseBuilder();
  }

  title(text: string): this {
    this.lines.push(`*${text}*`);
    return this;
  }

  subtitle(text: string): this {
    this.lines.push(`_${text}_`);
    return this;
  }

  separator(length: number = 20): this {
    this.lines.push(separator(length));
    return this;
  }

  line(text: string): this {
    this.lines.push(text);
    return this;
  }

  blank(): this {
    this.lines.push("");
    return this;
  }

  bullet(text: string): this {
    this.lines.push(`${S.BULLET} ${text}`);
    return this;
  }

  keyValue(key: string, value: string | number): this {
    this.lines.push(`${key}: ${value}`);
    return this;
  }

  success(text: string): this {
    this.lines.push(`${S.SUCCESS} ${text}`);
    return this;
  }

  error(text: string): this {
    this.lines.push(`${S.FAIL} ${text}`);
    return this;
  }

  warning(text: string): this {
    this.lines.push(`${S.WARN} ${text}`);
    return this;
  }

  loading(text: string): this {
    this.lines.push(`${S.LOADING} ${text}`);
    return this;
  }

  build(): string {
    return this.lines.join("\n");
  }
}

export function formatWeatherMessage(
  locationName: string,
  temperature: number,
  windspeed: number,
  isDay: boolean,
): string {
  const dayLabel = isDay ? "Siang" : "Malam";
  return ResponseBuilder.create()
    .line(`${S.SUN} Cuaca di ${locationName}`)
    .keyValue("Suhu", `${temperature}${S.TEMP}C`)
    .keyValue("Angin", `${windspeed} km/h`)
    .keyValue("Waktu", dayLabel)
    .build();
}

export function formatPrayerMessage(
  location: string,
  times: { Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string },
): string {
  return ResponseBuilder.create()
    .line(`${S.MOSQUE} Jadwal Sholat — ${location}`)
    .blank()
    .keyValue("Subuh", times.Fajr)
    .keyValue("Dzuhur", times.Dhuhr)
    .keyValue("Ashar", times.Asr)
    .keyValue("Maghrib", times.Maghrib)
    .keyValue("Isya", times.Isha)
    .build();
}

export function formatQuoteMessage(body: string, author: string): string {
  return `_"${body}"_\n\n${S.DASH} *${author}*`;
}

export function formatLyricsMessage(title: string, artist: string, lyrics: string): string {
  return `${S.NOTES} *${title}* ${S.DASH} ${artist}\n\n${lyrics}`;
}

export function formatAnimeMessage(
  title: string,
  type: string,
  year: number | null,
  score: number | null,
  synopsis: string,
  url: string,
): string {
  return ResponseBuilder.create()
    .line(`*${title}* (${type})`)
    .keyValue("Tayang", String(year ?? "N/A"))
    .keyValue("Skor", String(score ?? "N/A"))
    .line(synopsis.length > 500 ? synopsis.substring(0, 500) + "..." : synopsis)
    .blank()
    .line(`${S.ARROW_R} [Lihat di MAL](${url})`)
    .build();
}

export function formatEarthquakeMessage(data: {
  date: string;
  time: string;
  magnitude: string;
  depth: string;
  region: string;
  potential: string;
  coordinates: string;
  latitude: string;
  longitude: string;
}): string {
  return ResponseBuilder.create()
    .keyValue("Waktu", `${data.date} | ${data.time}`)
    .keyValue("Koordinat", data.coordinates)
    .keyValue("Lintang", data.latitude)
    .keyValue("Bujur", data.longitude)
    .keyValue("Magnitudo", `${data.magnitude} SR`)
    .keyValue("Kedalaman", data.depth)
    .keyValue("Wilayah", data.region)
    .keyValue("Potensi", data.potential)
    .build();
}

export function formatNewsMessage(
  articles: Array<{ title: string; url: string }>,
): string {
  const rb = ResponseBuilder.create().title("Berita Terkini").blank();

  for (const article of articles) {
    const title = article.title.length > 150 ? article.title.substring(0, 147) + "..." : article.title;
    if (article.url && article.url.startsWith("http")) {
      rb.line(`${S.BULLET} [${title}](${article.url})`);
    } else {
      rb.bullet(title);
    }
  }

  return rb.build();
}

export function formatPortfolioMessage(summary: {
  cashBalance: number;
  equity: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  positions: Array<{
    symbol: string;
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnL: number;
    unrealizedPnLPercent: number;
  }>;
}): string {
  const pnlIcon = summary.unrealizedPnL >= 0 ? S.UP : S.DOWN;
  const sign = summary.unrealizedPnL >= 0 ? "+" : "";

  const rb = ResponseBuilder.create()
    .title("Paper Trading Portfolio")
    .blank()
    .keyValue("Cash", formatUsd(summary.cashBalance))
    .keyValue("Equity", formatUsd(summary.equity))
    .line(`${pnlIcon} Unrealized PnL: ${sign}${formatUsd(summary.unrealizedPnL)} (${sign}${summary.unrealizedPnLPercent.toFixed(2)}%)`);

  if (summary.positions.length > 0) {
    rb.blank().title("Open Positions");
    for (const pos of summary.positions) {
      const posIcon = pos.unrealizedPnL >= 0 ? S.UP : S.DOWN;
      const posSign = pos.unrealizedPnL >= 0 ? "+" : "";
      rb.line(`${S.BULLET} ${pos.symbol}: ${pos.quantity} @ ${formatUsd(pos.entryPrice)}`);
      rb.line(`   ${posIcon} ${formatUsd(pos.marketValue)} (${posSign}${pos.unrealizedPnLPercent.toFixed(2)}%)`);
    }
  } else {
    rb.blank().subtitle("Tidak ada posisi terbuka");
  }

  return rb.build();
}

export function formatSentimentMessage(result: {
  keyword: string;
  sentiment: string;
  score: number;
  analysis: string;
  headlines: Array<{ title: string; url: string }>;
}): string {
  const icon = result.sentiment === "Bullish" ? S.UP : result.sentiment === "Bearish" ? S.DOWN : S.BULLET_ALT;
  const sign = result.score >= 0 ? "+" : "";

  const rb = ResponseBuilder.create()
    .title(`Sentiment Analysis: ${result.keyword}`)
    .blank()
    .line(`${icon} *${result.sentiment}* (${sign}${result.score})`)
    .blank()
    .line(result.analysis)
    .blank();

  if (result.headlines.length > 0) {
    rb.title("Recent Headlines");
    for (const h of result.headlines) {
      const t = h.title.length > 150 ? h.title.substring(0, 147) + "..." : h.title;
      if (h.url?.startsWith("http")) {
        rb.line(`${S.BULLET} [${t}](${h.url})`);
      } else {
        rb.bullet(t);
      }
    }
  }

  return rb.build();
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
