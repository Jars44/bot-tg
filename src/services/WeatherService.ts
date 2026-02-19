import { HttpClient } from "./HttpClient.js";
import { CONFIG } from "../config/index.js";
import { S } from "../config/symbols.js";

export type WeatherProvider = "BMKG" | "Open-Meteo";

export interface UnifiedWeatherData {
  provider: WeatherProvider;
  resolvedAddress: string;
  temperature: number;
  apparent_temperature: number;
  temp_max: number;
  temp_min: number;
  humidity: number;
  cloud_cover: number;
  windspeed: number;
  wind_direction: number;
  precipitation_probability: number;
  uv_index_max: number;
  sunrise: string;
  sunset: string;
  description: string;
  early_warning?: string;
  early_warning_desc?: string;
}

export type WeatherData = UnifiedWeatherData;

export interface Coordinates {
  lat: number;
  lon: number;
}

interface NominatimSearchItem {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    hamlet?: string;
    village?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

interface NominatimReverseItem {
  display_name: string;
  address?: {
    hamlet?: string;
    village?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

interface BmkgSlot {
  local_datetime: string;
  t: number;
  tcc: number;
  ws: number;
  wd_deg: number;
  hu: number;
  weather_desc: string;
}

interface BmkgApiResponse {
  lokasi: {
    lat: string;
    lon: string;
    timezone?: string;
  };
  data: Array<{
    cuaca: BmkgSlot[][];
  }>;
}

interface OpenMeteoCurrentValues {
  temperature_2m: number;
  apparent_temperature: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  cloud_cover: number;
  weather_code: number;
}

interface OpenMeteoDailyValues {
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  sunrise: string[];
  sunset: string[];
  precipitation_probability_max: number[];
  uv_index_max: number[];
}

interface OpenMeteoResponse {
  current: OpenMeteoCurrentValues;
  daily: OpenMeteoDailyValues;
}

/** Hardcoded map: normalized kota name → BMKG adm4 first-kelurahan code (all 98 Indonesian city municipalities). */
const KOTA_ADM4_MAP: Record<string, string> = {
  "BANDA ACEH": "11.71.01.1001",
  SABANG: "11.72.01.1001",
  LANGSA: "11.73.01.1001",
  LHOKSEUMAWE: "11.74.01.1001",
  SUBULUSSALAM: "11.75.01.1001",
  SIBOLGA: "12.71.01.1001",
  "TANJUNG BALAI": "12.72.01.1001",
  "PEMATANG SIANTAR": "12.73.01.1001",
  PEMATANGSIANTAR: "12.73.01.1001",
  "TEBING TINGGI": "12.74.01.1001",
  TEBINGTINGGI: "12.74.01.1001",
  MEDAN: "12.75.01.1001",
  BINJAI: "12.76.01.1001",
  PADANGSIDIMPUAN: "12.77.01.1001",
  GUNUNGSITOLI: "12.78.01.1001",
  PADANG: "13.71.01.1001",
  SOLOK: "13.72.01.1001",
  "SAWAH LUNTO": "13.73.01.1001",
  SAWAHLUNTO: "13.73.01.1001",
  "PADANG PANJANG": "13.74.01.1001",
  BUKITTINGGI: "13.75.01.1001",
  PAYAKUMBUH: "13.76.01.1001",
  PARIAMAN: "13.77.01.1001",
  PEKANBARU: "14.71.01.1001",
  DUMAI: "14.73.01.1001",
  JAMBI: "15.71.01.1001",
  "SUNGAI PENUH": "15.72.01.1001",
  SUNGAIPENUH: "15.72.01.1001",
  PALEMBANG: "16.71.01.1001",
  PRABUMULIH: "16.72.01.1001",
  "PAGAR ALAM": "16.73.01.1001",
  PAGARALAM: "16.73.01.1001",
  LUBUKLINGGAU: "16.74.01.1001",
  BENGKULU: "17.71.01.1001",
  "BANDAR LAMPUNG": "18.71.01.1001",
  BANDARLAMPUNG: "18.71.01.1001",
  METRO: "18.72.01.1001",
  "PANGKAL PINANG": "19.71.01.1001",
  PANGKALPINANG: "19.71.01.1001",
  BATAM: "21.71.01.1001",
  "TANJUNG PINANG": "21.72.01.1001",
  TANJUNGPINANG: "21.72.01.1001",
  "JAKARTA SELATAN": "31.71.01.1001",
  "JAKARTA TIMUR": "31.72.01.1001",
  "JAKARTA PUSAT": "31.73.01.1001",
  "JAKARTA BARAT": "31.74.01.1001",
  "JAKARTA UTARA": "31.75.01.1001",
  BOGOR: "32.71.01.1001",
  SUKABUMI: "32.72.01.1001",
  BANDUNG: "32.73.01.1001",
  CIREBON: "32.74.01.1001",
  BEKASI: "32.75.01.1001",
  DEPOK: "32.76.01.1001",
  CIMAHI: "32.77.01.1001",
  TASIKMALAYA: "32.78.01.1001",
  BANJAR: "32.79.01.1001",
  MAGELANG: "33.71.01.1001",
  SURAKARTA: "33.72.01.1001",
  SOLO: "33.72.01.1001",
  SALATIGA: "33.73.01.1001",
  SEMARANG: "33.74.01.1001",
  PEKALONGAN: "33.75.01.1001",
  TEGAL: "33.76.01.1001",
  YOGYAKARTA: "34.71.01.1001",
  JOGJA: "34.71.01.1001",
  JOGJAKARTA: "34.71.01.1001",
  KEDIRI: "35.71.01.1001",
  BLITAR: "35.72.01.1001",
  MALANG: "35.73.01.1001",
  PROBOLINGGO: "35.74.01.1001",
  PASURUAN: "35.75.01.1001",
  MOJOKERTO: "35.76.01.1001",
  MADIUN: "35.77.01.1001",
  SURABAYA: "35.78.01.1001",
  BATU: "35.79.01.1001",
  TANGERANG: "36.71.01.1001",
  CILEGON: "36.72.01.1001",
  SERANG: "36.73.01.1001",
  "TANGERANG SELATAN": "36.74.01.1001",
  TANGSEL: "36.74.01.1001",
  DENPASAR: "51.71.01.1001",
  MATARAM: "52.71.01.1001",
  BIMA: "52.72.01.1001",
  KUPANG: "53.71.01.1001",
  PONTIANAK: "61.71.01.1001",
  SINGKAWANG: "61.72.01.1001",
  "PALANGKA RAYA": "62.71.01.1001",
  PALANGKARAYA: "62.71.01.1001",
  BANJARMASIN: "63.71.01.1001",
  BANJARBARU: "63.72.01.1001",
  "BANJAR BARU": "63.72.01.1001",
  BALIKPAPAN: "64.71.01.1001",
  SAMARINDA: "64.72.01.1001",
  BONTANG: "64.74.01.1001",
  TARAKAN: "65.71.01.1001",
  MANADO: "71.71.01.1001",
  BITUNG: "71.72.01.1001",
  TOMOHON: "71.73.01.1001",
  KOTAMOBAGU: "71.74.01.1001",
  PALU: "72.71.01.1001",
  MAKASSAR: "73.71.01.1001",
  "UJUNG PANDANG": "73.71.01.1001",
  PAREPARE: "73.72.01.1001",
  PALOPO: "73.73.01.1001",
  KENDARI: "74.71.01.1001",
  BAUBAU: "74.72.01.1001",
  GORONTALO: "75.71.01.1001",
  AMBON: "81.71.01.1001",
  TUAL: "81.72.01.1001",
  TERNATE: "82.71.01.1001",
  "TIDORE KEPULAUAN": "82.72.01.1001",
  TIDORE: "82.72.01.1001",
  SORONG: "91.71.01.1001",
  JAYAPURA: "94.71.01.1001",
};

export class WeatherService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  private getWmoDescription(code: number): string {
    if (code === 0) return "Cerah";
    if (code === 1) return "Cerah Berawan";
    if (code === 2) return "Berawan Sebagian";
    if (code === 3) return "Mendung";
    if (code === 45 || code === 48) return "Berkabut";
    if (code === 51 || code === 53 || code === 55) return "Gerimis";
    if (code === 56 || code === 57) return "Gerimis Beku";
    if (code === 61 || code === 63 || code === 65) return "Hujan";
    if (code === 66 || code === 67) return "Hujan Beku";
    if (code === 71 || code === 73 || code === 75) return "Salju";
    if (code === 77) return "Butiran Salju";
    if (code === 80 || code === 81 || code === 82) return "Hujan Lebat";
    if (code === 85 || code === 86) return "Hujan Salju";
    if (code === 95) return "Badai Petir";
    if (code === 96 || code === 99) return "Badai Petir + Hujan Es";
    return "Tidak Diketahui";
  }

  private getBmkgPrecipProbability(desc: string): number {
    const d = desc.toLowerCase();
    if (d.includes("petir") || d.includes("badai")) return 90;
    if (d.includes("lebat")) return 85;
    if (d.includes("sedang")) return 70;
    if (d.includes("ringan") || d.includes("lokal")) return 55;
    if (d.includes("hujan")) return 50;
    if (d.includes("gerimis")) return 35;
    if (d.includes("berawan tebal")) return 25;
    if (d.includes("berawan")) return 10;
    return 5;
  }

  private computeApparentTemperature(tempC: number, humidity: number): number {
    if (tempC < 27) return tempC;
    const T = tempC;
    const RH = humidity;
    const HI =
      -8.78469475556 +
      1.61139411 * T +
      2.33854883889 * RH -
      0.14611605 * T * RH -
      0.012308094 * T * T -
      0.0164248277778 * RH * RH +
      0.002211732 * T * T * RH +
      0.00072546 * T * RH * RH -
      0.000003582 * T * T * RH * RH;
    return Math.round(HI);
  }

  private computeSunriseSunset(lat: number, lon: number): { sunrise: string; sunset: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
    const rad = Math.PI / 180;
    const B = (360 / 365) * (dayOfYear - 81) * rad;
    const eqTime = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const decl = 23.45 * Math.sin(B) * rad;
    const cosHa = -Math.tan(lat * rad) * Math.tan(decl);
    const ha = Math.acos(Math.max(-1, Math.min(1, cosHa))) * (180 / Math.PI);
    const tzOffset = Math.round(lon / 15);
    const lonOffset = (lon % 15) / 15;
    const rise = 12 - ha / 15 - eqTime / 60 - lonOffset;
    const set = 12 + ha / 15 - eqTime / 60 - lonOffset;
    const toHHMM = (h: number) => {
      const total = (((h + tzOffset) % 24) + 24) % 24;
      const hh = Math.floor(total).toString().padStart(2, "0");
      const mm = Math.round((total - Math.floor(total)) * 60)
        .toString()
        .padStart(2, "0");
      return `${hh}:${mm}`;
    };
    return { sunrise: toHHMM(rise), sunset: toHHMM(set) };
  }

  private formatTime(isoString: string): string {
    const date = new Date(isoString);
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    return `${hh}:${mm}`;
  }

  private findNearestSlot(slots: BmkgSlot[][]): BmkgSlot | null {
    const flat = slots.flat();
    if (flat.length === 0) return null;
    const now = Date.now();
    return flat.reduce((best, slot) => {
      const slotTime = new Date(slot.local_datetime.replace(" ", "T")).getTime();
      const bestTime = new Date(best.local_datetime.replace(" ", "T")).getTime();
      return Math.abs(slotTime - now) < Math.abs(bestTime - now) ? slot : best;
    });
  }

  private getDailyTempRange(slots: BmkgSlot[][]): { max: number; min: number } {
    const todaySlots = slots[0] ?? [];
    if (todaySlots.length === 0) return { max: 30, min: 22 };
    const temps = todaySlots.map((s) => s.t);
    return { max: Math.max(...temps), min: Math.min(...temps) };
  }

  private windDirectionLabel(degrees: number): string {
    const dirs = ["Utara", "Timur Laut", "Timur", "Tenggara", "Selatan", "Barat Daya", "Barat", "Barat Laut"];
    return dirs[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
  }

  /** Lookup BMKG adm4 code from Nominatim address fields using the hardcoded kota map. */
  private lookupKotaAdm4(addr: {
    county?: string;
    city?: string;
    city_district?: string;
    town?: string;
  }): string | null {
    const normalize = (s: string) =>
      s
        .toUpperCase()
        .replace(/^(KOTA ADM\.\s*|KOTA\s+|KABUPATEN\s+|DAERAH ISTIMEWA\s+|DAERAH KHUSUS IBUKOTA\s+|DI\s+|DKI\s+)/i, "")
        .replace(/\s+/g, " ")
        .trim();
    const candidates = [addr.county, addr.city, addr.city_district, addr.town]
      .filter(Boolean)
      .map((n) => normalize(n!));
    for (const key of candidates) {
      if (KOTA_ADM4_MAP[key]) return KOTA_ADM4_MAP[key];
    }
    return null;
  }

  private buildLocationString(addr: Record<string, string | undefined>): string {
    const stripPrefix =
      /^(Kabupaten\s+|Kota Adm\.\s*|Kota\s+|Daerah Istimewa\s+|Daerah Khusus Ibukota\s+|DI\s+|DKI\s+)/i;
    const place = addr.hamlet ?? addr.village ?? addr.suburb ?? addr.city_district ?? addr.town ?? addr.city ?? "";
    const rawCounty = addr.county ?? "";
    const county = rawCounty.replace(stripPrefix, "").trim();
    const state = addr.state ?? "";
    const country = addr.country ?? "";
    const normPlace = place.replace(stripPrefix, "").trim();
    const showCounty = county.length > 0 && normPlace.toLowerCase() !== county.toLowerCase();
    return [normPlace, showCounty ? county : "", state || (!normPlace && !county ? country : "")]
      .filter(Boolean)
      .join(", ");
  }

  private async geocodeCity(cityName: string): Promise<{
    lat: number;
    lon: number;
    countryCode: string;
    locationName: string;
  } | null> {
    try {
      const results = await this.http.get<NominatimSearchItem[]>(`${CONFIG.API.NOMINATIM}/search`, {
        params: { q: cityName, format: "json", addressdetails: 1, limit: 1 },
        headers: { "User-Agent": CONFIG.USER_AGENT, "Accept-Language": "id, en" },
      });
      if (!results.length) return null;
      const r = results[0];
      const addr = r.address ?? {};
      const locationName = this.buildLocationString(addr) || r.display_name.split(",")[0].trim();
      return {
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        countryCode: ((addr.country_code ?? "") as string).toLowerCase(),
        locationName,
      };
    } catch {
      return null;
    }
  }

  private async reverseGeocodeCoords(
    lat: number,
    lon: number,
  ): Promise<{ countryCode: string; adm4Code: string | null; province: string | null; locationName: string }> {
    try {
      const r = await this.http.get<NominatimReverseItem>(`${CONFIG.API.NOMINATIM}/reverse`, {
        params: { lat, lon, format: "json", addressdetails: 1, zoom: 10 },
        headers: { "User-Agent": CONFIG.USER_AGENT, "Accept-Language": "id" },
      });
      const addr = r.address ?? {};
      const countryCode = (addr.country_code ?? "").toLowerCase();
      const state = addr.state ?? null;
      const locationName =
        this.buildLocationString(addr as Record<string, string | undefined>) || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      const adm4Code = countryCode === "id" ? this.lookupKotaAdm4(addr) : null;
      return { countryCode, adm4Code, province: state, locationName };
    } catch {
      return { countryCode: "", adm4Code: null, province: null, locationName: `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
    }
  }

  private extractXmlTag(xml: string, tag: string): string | null {
    const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
    if (!match) return null;
    return match[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]+>/g, "")
      .trim();
  }

  private async fetchBmkgEarlyWarning(province: string): Promise<{ title: string; description: string } | null> {
    try {
      const xml = await this.http.get<string>(CONFIG.API.BMKG_NOWCAST, {
        headers: { "User-Agent": CONFIG.USER_AGENT },
        responseType: "text",
      });
      const normalizedQuery = province
        .toLowerCase()
        .replace(/^(daerah istimewa|dki|kepulauan riau|kepulauan bangka belitung|kepulauan|provinsi)\s*/i, "")
        .trim();
      const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
      let m: RegExpExecArray | null;
      while ((m = itemPattern.exec(xml)) !== null) {
        const itemXml = m[1];
        const title = this.extractXmlTag(itemXml, "title") ?? "";
        const titleNorm = title.toLowerCase();
        if (titleNorm.includes(normalizedQuery)) {
          const description = this.extractXmlTag(itemXml, "description") ?? "";
          return { title, description };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private async fetchFromBMKG(
    lat: number,
    lon: number,
    adm4Code: string,
    resolvedAddress: string,
    province: string | null,
  ): Promise<UnifiedWeatherData> {
    const data = await this.http.get<BmkgApiResponse>(CONFIG.API.BMKG_API, {
      params: { adm4: adm4Code },
      headers: { "User-Agent": CONFIG.USER_AGENT },
    });
    const slots = data.data[0]?.cuaca;
    if (!slots?.length) throw new Error("BMKG: no cuaca data");
    const slot = this.findNearestSlot(slots);
    if (!slot) throw new Error("BMKG: no nearest slot");
    const { max, min } = this.getDailyTempRange(slots);
    const { sunrise, sunset } = this.computeSunriseSunset(lat, lon);
    const warning = province ? await this.fetchBmkgEarlyWarning(province) : null;
    return {
      provider: "BMKG",
      resolvedAddress,
      temperature: slot.t,
      apparent_temperature: this.computeApparentTemperature(slot.t, slot.hu),
      temp_max: max,
      temp_min: min,
      humidity: slot.hu,
      cloud_cover: slot.tcc,
      windspeed: Math.round(slot.ws),
      wind_direction: slot.wd_deg ?? 0,
      precipitation_probability: this.getBmkgPrecipProbability(slot.weather_desc),
      uv_index_max: 0,
      sunrise,
      sunset,
      description: slot.weather_desc,
      early_warning: warning?.title,
      early_warning_desc: warning?.description,
    };
  }

  private async fetchFromOpenMeteo(lat: number, lon: number, resolvedAddress: string): Promise<UnifiedWeatherData> {
    const response = await this.http.get<OpenMeteoResponse>(CONFIG.API.OPEN_METEO, {
      params: {
        latitude: lat,
        longitude: lon,
        current:
          "temperature_2m,apparent_temperature,relative_humidity_2m,cloud_cover,wind_speed_10m,wind_direction_10m,weather_code",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset",
        timezone: "auto",
        forecast_days: 1,
      },
    });
    const c = response.current;
    const d = response.daily;
    return {
      provider: "Open-Meteo",
      resolvedAddress,
      temperature: Math.round(c.temperature_2m),
      apparent_temperature: Math.round(c.apparent_temperature),
      temp_max: Math.round(d.temperature_2m_max[0]),
      temp_min: Math.round(d.temperature_2m_min[0]),
      humidity: c.relative_humidity_2m,
      cloud_cover: c.cloud_cover,
      windspeed: Math.round(c.wind_speed_10m),
      wind_direction: c.wind_direction_10m,
      precipitation_probability: d.precipitation_probability_max[0] ?? 0,
      uv_index_max: Math.round(d.uv_index_max[0] ?? 0),
      sunrise: this.formatTime(d.sunrise[0]),
      sunset: this.formatTime(d.sunset[0]),
      description: this.getWmoDescription(c.weather_code),
    };
  }

  private async fetchHybridIndonesia(
    lat: number,
    lon: number,
    adm4Code: string,
    resolvedAddress: string,
    province: string | null,
  ): Promise<UnifiedWeatherData> {
    const [bmkgResult, omResult] = await Promise.allSettled([
      this.fetchFromBMKG(lat, lon, adm4Code, resolvedAddress, province),
      this.fetchFromOpenMeteo(lat, lon, resolvedAddress),
    ]);

    const om = omResult.status === "fulfilled" ? omResult.value : null;
    const bmkg = bmkgResult.status === "fulfilled" ? bmkgResult.value : null;

    if (bmkg && om) {
      return {
        provider: "BMKG",
        resolvedAddress,
        temperature: bmkg.temperature,
        apparent_temperature: bmkg.apparent_temperature,
        temp_max: bmkg.temp_max,
        temp_min: bmkg.temp_min,
        humidity: bmkg.humidity,
        cloud_cover: bmkg.cloud_cover,
        windspeed: bmkg.windspeed,
        wind_direction: bmkg.wind_direction,
        precipitation_probability: bmkg.precipitation_probability,
        description: bmkg.description,
        uv_index_max: om.uv_index_max,
        sunrise: om.sunrise,
        sunset: om.sunset,
        early_warning: bmkg.early_warning,
        early_warning_desc: bmkg.early_warning_desc,
      };
    }
    if (bmkg) return bmkg;
    if (om) return om;
    throw new Error("Both BMKG and Open-Meteo failed");
  }

  private async routeWeather(
    lat: number,
    lon: number,
    countryCode: string,
    adm4Code: string | null,
    province: string | null,
    resolvedAddress: string,
  ): Promise<UnifiedWeatherData> {
    if (countryCode === "id" && adm4Code) {
      try {
        return await this.fetchHybridIndonesia(lat, lon, adm4Code, resolvedAddress, province);
      } catch {
        return await this.fetchFromOpenMeteo(lat, lon, resolvedAddress);
      }
    }
    return await this.fetchFromOpenMeteo(lat, lon, resolvedAddress);
  }

  async getCoordinates(cityName: string): Promise<Coordinates | null> {
    const result = await this.geocodeCity(cityName);
    if (!result) return null;
    return { lat: result.lat, lon: result.lon };
  }

  async getWeatherByLocation(location?: string): Promise<{
    weather: UnifiedWeatherData;
    locationName: string;
  } | null> {
    let lat: number = CONFIG.DEFAULT_LOCATION.lat;
    let lon: number = CONFIG.DEFAULT_LOCATION.lon;
    let countryCode = "id";
    let adm4Code: string | null = null;
    let province: string | null = null;
    let locationName: string = CONFIG.DEFAULT_LOCATION.name;

    if (location) {
      const geo = await this.geocodeCity(location);
      if (!geo) return null;
      lat = geo.lat;
      lon = geo.lon;
      countryCode = geo.countryCode;
      locationName = geo.locationName;
    }

    if (countryCode === "id") {
      const rev = await this.reverseGeocodeCoords(lat, lon);
      adm4Code = rev.adm4Code;
      province = rev.province;
      if (!location) {
        locationName = rev.locationName;
      }
    }

    const weather = await this.routeWeather(lat, lon, countryCode, adm4Code, province, locationName);
    return { weather, locationName };
  }

  async getWeatherByCoords(
    lat: number,
    lon: number,
  ): Promise<{ weather: UnifiedWeatherData; locationName: string } | null> {
    try {
      const { countryCode, adm4Code, province, locationName } = await this.reverseGeocodeCoords(lat, lon);
      const weather = await this.routeWeather(lat, lon, countryCode, adm4Code, province, locationName);
      return { weather, locationName };
    } catch {
      return null;
    }
  }

  async formattedWeatherByCoords(lat: number, lon: number): Promise<string> {
    const result = await this.getWeatherByCoords(lat, lon);
    if (!result) throw new Error("Failed to fetch weather data");
    return this.formatWeatherMessage(result.weather);
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[*_`[\]]/g, "\\$&");
  }

  formatWeatherMessage(weather: UnifiedWeatherData, overrideName?: string): string {
    const name = overrideName ?? weather.resolvedAddress;
    const safeName = this.escapeMarkdown(name);
    const safeDesc = this.escapeMarkdown(weather.description);
    const windLabel = this.windDirectionLabel(weather.wind_direction);
    const earlyWarnLines: string[] = [];
    if (weather.early_warning) {
      earlyWarnLines.push(``, `*${S.WARN} Peringatan Dini:* ${this.escapeMarkdown(weather.early_warning)}`);
      if (weather.early_warning_desc) {
        earlyWarnLines.push(this.escapeMarkdown(weather.early_warning_desc));
      }
    }
    return [
      `*Cuaca di ${safeName}*`,
      `Kondisi: ${safeDesc}`,
      ``,
      `*Suhu:* ${weather.temperature}°C (Terasa Seperti: ${weather.apparent_temperature}°C)`,
      `*Maks/Min:* ${weather.temp_max}°C / ${weather.temp_min}°C`,
      `*Kelembapan:* ${weather.humidity}%`,
      `*Angin:* ${weather.windspeed} km/h (${windLabel} / ${weather.wind_direction}°)`,
      `*Peluang Hujan:* ${weather.precipitation_probability}%`,
      `*UV Index:* ${weather.uv_index_max}`,
      ``,
      `*Terbit:* ${weather.sunrise}`,
      `*Terbenam:* ${weather.sunset}`,
      ...earlyWarnLines,
      ``,
      `_Sumber Data: ${weather.provider}_`,
    ].join("\n");
  }
}
