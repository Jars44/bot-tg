import type { AIService } from "./GenAIService.js";
import type { HttpClient } from "./HttpClient.js";
import { CONFIG } from "../config/index.js";
import { S } from "../config/symbols.js";

export interface PhotographyMission {
  title: string;
  description: string;
  subject: string;
  technique: string;
  lighting: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  tips: string[];
  locationType: string;
}

interface NominatimReverseResult {
  display_name: string;
  type?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    road?: string;
    state?: string;
    country?: string;
    amenity?: string;
    building?: string;
    shop?: string;
    tourism?: string;
    leisure?: string;
  };
}

interface AIMissionResponse {
  title: string;
  description: string;
  subject: string;
  technique: string;
  lighting: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  tips: string[];
}

const SUBJECTS = [
  "A lone figure walking away from camera",
  "Symmetrical architecture or doorways",
  "A cat or street animal in its element",
  "Hands performing a craft or trade",
  "Reflections in puddles or glass",
  "An elderly person with character-rich features",
  "Stacked textures (rust, peeling paint, graffiti layers)",
  "A child mid-play or mid-laugh",
  "Geometric shadows cast by buildings",
  "Tangled wires or cables against the sky",
  "A vendor serving food from a cart",
  "Silhouettes through a backlit doorway",
  "A row of identical objects with one break in pattern",
  "Street signage with interesting typography",
  "Motion blur of a passing vehicle",
];

const TECHNIQUES = [
  "Shoot through a frame (doorway, window, arch)",
  "Use leading lines to draw the eye",
  "Fill the frame — get close, eliminate background",
  "Use the Dutch angle for tension",
  "Capture a long exposure (1–3 seconds)",
  "Shoot from ground level (worm's eye view)",
  "Use negative space to isolate the subject",
  "Layer foreground, midground, and background",
  "Shoot through glass or water for distortion",
  "Use repetition and pattern recognition",
  "Capture a decisive moment (Bresson-style)",
  "Intentional camera movement for abstraction",
  "Use high contrast black & white thinking",
  "Find and exploit color contrast",
];

const LIGHTING_CONDITIONS = [
  "Golden Hour — warm, directional, long shadows",
  "Blue Hour — cool ambient, neon signs pop",
  "Harsh Midday Sun — deep shadows, high contrast",
  "Overcast — soft, even light, saturated colors",
  "Artificial light — fluorescent, tungsten, LED mix",
  "Backlighting — silhouettes and rim light",
  "Dappled light filtering through trees or lattice",
  "Mixed lighting — street lamps + twilight sky",
  "Direct flash — raw, documentary, confrontational",
  "Window light — soft, single-direction, portrait-ready",
];

const LOCATION_CLASSIFICATIONS: Record<string, string[]> = {
  market: ["market", "marketplace", "bazaar", "shop", "retail", "commercial"],
  park: ["park", "garden", "recreation", "playground", "green", "leisure"],
  industrial: ["industrial", "factory", "warehouse", "construction"],
  residential: ["residential", "suburb", "neighbourhood", "housing", "apartments"],
  religious: ["mosque", "church", "temple", "religious", "cemetery"],
  transport: ["station", "bus_stop", "terminal", "airport", "railway"],
  education: ["school", "university", "college", "library"],
  historic: ["historic", "heritage", "monument", "castle", "museum", "tourism"],
  waterfront: ["river", "lake", "beach", "harbour", "pier", "waterway"],
  urban: ["road", "street", "avenue", "highway", "intersection"],
};

const DIFFICULTIES: Array<"Beginner" | "Intermediate" | "Advanced"> = ["Beginner", "Intermediate", "Advanced"];

export class UrbanExplorationService {
  private aiService: AIService;
  private httpClient: HttpClient;

  constructor(aiService: AIService, httpClient: HttpClient) {
    this.aiService = aiService;
    this.httpClient = httpClient;
  }

  async generateMission(lat: number, lon: number): Promise<PhotographyMission> {
    const geoContext = await this.getGeoContext(lat, lon);

    try {
      return await this.generateMissionAI(geoContext);
    } catch (error: unknown) {
      const isUnavailable = error instanceof Error && error.name === "AIServiceUnavailableError";
      if (!isUnavailable) {
        console.error("[UrbanExplorationService] Unexpected AI error:", error);
      }
      console.log("[UrbanExplorationService] Falling back to procedural mission");
    }

    return this.generateMissionFallback(geoContext);
  }

  private async generateMissionAI(context: GeoContext): Promise<PhotographyMission> {
    const prompt = [
      `Kamu adalah mentor street photography yang membuat misi fotografi spesifik.`,
      ``,
      `Konteks lokasi: ${context.description}`,
      `Tipe lokasi: ${context.locationType}`,
      `Alamat: ${context.address}`,
      ``,
      `Buat misi fotografi jalanan yang kreatif dan spesifik untuk lokasi ini.`,
      `Pertimbangkan tipe lokasi saat merancang misi.`,
      `SEMUA teks (judul, deskripsi, subjek, teknik, pencahayaan, tips) HARUS dalam Bahasa Indonesia.`,
      `Untuk "difficulty" gunakan salah satu: "Pemula", "Menengah", "Mahir".`,
      ``,
      `Return ONLY valid JSON (no markdown) with:`,
      `{`,
      `  "title": "string (nama misi menarik 3-5 kata)",`,
      `  "description": "string (deskripsi misi detail 2-3 kalimat)",`,
      `  "subject": "string (apa yang difoto)",`,
      `  "technique": "string (cara memotretnya)",`,
      `  "lighting": "string (kondisi cahaya yang dimanfaatkan)",`,
      `  "difficulty": "Pemula|Menengah|Mahir",`,
      `  "tips": ["string", "string"] (2-3 tips profesional dalam Bahasa Indonesia)`,
      `}`,
    ].join("\n");

    const result = await this.aiService.generateJSON<AIMissionResponse>(prompt, 0.9);

    return {
      ...result,
      locationType: context.locationType,
    };
  }

  private generateMissionFallback(context: GeoContext): PhotographyMission {
    const subject = this.randomPick(SUBJECTS);
    const technique = this.randomPick(TECHNIQUES);
    const lighting = this.randomPick(LIGHTING_CONDITIONS);
    const difficulty = this.randomPick(DIFFICULTIES);

    const tips = this.generateTips(context.locationType);

    return {
      title: `${context.locationType} Expedition`,
      description: `Your mission at this ${context.locationType.toLowerCase()} location: find and capture "${subject}" using the technique described below. Pay attention to available light.`,
      subject,
      technique,
      lighting,
      difficulty,
      tips,
      locationType: context.locationType,
    };
  }

  private generateTips(locationType: string): string[] {
    const baseTips = [
      "Observe for 5 minutes before shooting. Let the scene reveal itself.",
      "Shoot in bursts during peak action — review later.",
      "Look behind you. The best shot is often where you didn't expect.",
    ];

    const locationTips: Record<string, string> = {
      Market: "Markets are chaotic. Embrace layers — stack vendors, goods, and customers.",
      Park: "Use natural frames (branches, archways) for added depth.",
      Industrial: "Look for repetitive patterns — pipes, bricks, containers.",
      Residential: "Respect privacy. Shoot wide establishing shots, not close portraits.",
      Religious: "Be respectful and silent. Capture light through architecture.",
      Transport: "Motion is your friend. Slow shutter + panning = dynamic energy.",
      Urban: "Crosswalks and intersections create natural leading lines.",
    };

    const specific = locationTips[locationType];
    const selected = [baseTips[Math.floor(Math.random() * baseTips.length)]];
    if (specific) selected.push(specific);

    return selected;
  }

  private async getGeoContext(lat: number, lon: number): Promise<GeoContext> {
    try {
      const result = await this.httpClient.get<NominatimReverseResult>(`${CONFIG.API.NOMINATIM}/reverse`, {
        params: { format: "json", lat, lon, zoom: 18, addressdetails: 1 },
        headers: { "User-Agent": CONFIG.USER_AGENT },
      });

      const locationType = this.classifyLocation(result);

      return {
        address: result.display_name,
        locationType,
        description: `${locationType} area: ${result.display_name}`,
      };
    } catch {
      return {
        address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        locationType: "Urban",
        description: "Urban area (location details unavailable)",
      };
    }
  }

  private classifyLocation(result: NominatimReverseResult): string {
    const searchText = [
      result.type ?? "",
      result.address?.amenity ?? "",
      result.address?.building ?? "",
      result.address?.shop ?? "",
      result.address?.tourism ?? "",
      result.address?.leisure ?? "",
    ]
      .join(" ")
      .toLowerCase();

    for (const [category, keywords] of Object.entries(LOCATION_CLASSIFICATIONS)) {
      if (keywords.some((kw) => searchText.includes(kw))) {
        return this.capitalize(category);
      }
    }

    return "Urban";
  }

  private randomPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  formatMissionMessage(mission: PhotographyMission): string {
    const tips = mission.tips.map((t) => `• ${t}`).join("\n");

    return [
      `*${S.LENS} Misi Fotografi*`,
      `"${mission.title}"`,
      ``,
      `*Area:* ${mission.locationType}`,
      `*Kesulitan:* ${mission.difficulty}`,
      ``,
      `*Misi*`,
      `${mission.description}`,
      ``,
      `*Subjek:* ${mission.subject}`,
      `*Teknik:* ${mission.technique}`,
      `*Pencahayaan:* ${mission.lighting}`,
      ``,
      `*Tips*`,
      tips,
    ].join("\n");
  }
}

interface GeoContext {
  address: string;
  locationType: string;
  description: string;
}
