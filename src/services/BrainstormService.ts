import type { AIService } from "./GenAIService.js";
import { S } from "../config/symbols.js";

export type BrainstormMode = "character" | "plot" | "world" | "idea" | "lore";

export interface CharacterProfile {
  name: string;
  archetype: string;
  motivation: string;
  flaw: string;
  backstory: string;
  quirk: string;
}

export interface PlotHook {
  title: string;
  genre: string;
  premise: string;
  conflict: string;
  twist: string;
}

export interface WorldBuilding {
  name: string;
  type: string;
  geography: string;
  culture: string;
  conflict: string;
  secret: string;
}

export interface IdeaSeed {
  concept: string;
  tagline: string;
  audience: string;
  uniqueAngle: string;
}

export interface LoreEntry {
  title: string;
  era: string;
  event: string;
  consequence: string;
  artifact: string;
}

export type BrainstormResult =
  | { mode: "character"; data: CharacterProfile }
  | { mode: "plot"; data: PlotHook }
  | { mode: "world"; data: WorldBuilding }
  | { mode: "idea"; data: IdeaSeed }
  | { mode: "lore"; data: LoreEntry };

const ARCHETYPES = [
  "The Reluctant Hero",
  "The Trickster",
  "The Sage",
  "The Outcast",
  "The Guardian",
  "The Rebel",
  "The Visionary",
  "The Orphan",
  "The Mentor",
  "The Shapeshifter",
  "The Shadow-Self",
  "The Innocent Turned Villain",
];

const MOTIVATIONS = [
  "seeks to avenge a lost loved one",
  "wants to uncover a family secret buried for generations",
  "is driven by a debt that can never be repaid",
  "hunts for a cure to an incurable condition",
  "needs to protect the last of their kind",
  "desires to rewrite history itself",
  "is bound by an oath they no longer believe in",
  "craves recognition from a world that forgot them",
  "pursues forbidden knowledge at any cost",
  "is running from something that cannot be outrun",
];

const FLAWS = [
  "Cannot trust anyone, even allies",
  "Addicted to risk — the higher, the better",
  "Pathologically honest, even when it destroys",
  "Crippled by guilt over an accident years ago",
  "Obsessed with perfection to the point of paralysis",
  "Self-destructive when things go right",
  "Manipulative — sees people as chess pieces",
  "Hoards secrets that poison every relationship",
  "Afraid of silence — fills every moment with noise",
  "Cannot say no, even at great personal cost",
];

const QUIRKS = [
  "Collects pressed flowers from crime scenes",
  "Always hums the same melody nobody recognizes",
  "Writes letters to their future self",
  "Refuses to eat any food they haven't cooked themselves",
  "Keeps a journal in a dead language",
  "Talks to machines as if they're sentient",
  "Only sleeps during thunderstorms",
  "Memorizes exit routes in every room they enter",
];

const GENRES = [
  "Noir Thriller",
  "Solarpunk",
  "Gothic Horror",
  "Space Opera",
  "Urban Fantasy",
  "Historical Mystery",
  "Cyberpunk",
  "Magical Realism",
  "Post-Apocalyptic",
  "Mythic Fantasy",
];

const PREMISES = [
  "A message arrives from {years} years in the future — and it's in your handwriting",
  "The last library on earth is about to be burned — but one book holds the key to everything",
  "Every mirror in the city simultaneously shows a different reflection",
  "Someone takes a job as an AI trainer and discovers the AI is learning from their dreams",
  "A detective must solve their own murder — but they don't remember dying",
  "The world's most powerful corporation is secretly run by a child",
  "Music has been outlawed. An underground band discovers their songs literally reshape reality",
  "A diplomat is sent to negotiate peace with a civilization that communicates through scent",
];

const CONFLICTS = [
  "An ancient force awakens that does not distinguish between friend and foe",
  "Two factions each possess half a truth — together it would destroy both",
  "A cure and a weapon are the same invention",
  "The protagonist's greatest ally is revealed to be the architect of their suffering",
  "Time is running backward — and nobody else has noticed",
  "A prophecy is being fulfilled, but it was written by the antagonist",
  "The cost of victory requires erasing one's own existence from history",
];

const TWISTS = [
  "The villain and the hero are the same person from divergent timelines",
  "The whole quest was a test — and they already passed before it began",
  "The 'dead' character has been narrating the entire story",
  "The paradise they sought was a prison in disguise",
  "Winning the war costs them the very thing they were fighting for",
  "The ancient artifact is alive — and it disagrees with its wielder",
  "The true antagonist is the concept of hope itself",
];

const WORLD_TYPES = [
  "Floating archipelago connected by wind-bridges",
  "Subterranean megacity lit by bioluminescent fungi",
  "Post-collapse utopia built inside a dormant volcano",
  "Interdimensional marketplace at the edge of realities",
  "Living forest that rearranges itself with the seasons",
  "Frozen ocean with civilizations on the ice surface",
  "Sentient city that grows and evolves like an organism",
];

const CULTURES = [
  "Knowledge is currency — the more you know, the wealthier you are",
  "Art is the only accepted form of governance",
  "Silence is sacred — speech requires ritual permission",
  "Emotions are traded as physical commodities",
  "Dreams are shared communally every morning",
  "Music determines social hierarchy",
  "Memory is external — stored in crystals, not brains",
];

const ERAS = [
  "The Age of Fractured Skies",
  "The Long Silence",
  "The Second Awakening",
  "The Era of Living Machines",
  "The Crimson Epoch",
  "The Time Before Names",
  "The Great Convergence",
];

const ARTIFACTS = [
  "A compass that points to one's deepest regret",
  "A mirror that shows the viewer at their moment of death",
  "A key that opens doors that don't yet exist",
  "A book whose pages are blank until read aloud",
  "A crown that grants power proportional to suffering endured",
  "A lantern fueled by lies — the bigger the lie, the brighter it burns",
  "A clock that ticks backward for those who tell the truth",
];

const NAMES = [
  "Serin Voss",
  "Kael Marthine",
  "Ysadora Flux",
  "Corven Drai",
  "Liora Ashveil",
  "Thane Bellwick",
  "Nyx Solander",
  "Riven Calloway",
  "Eira Thornmond",
  "Zael Penrose",
  "Mira Kastellan",
  "Dex Aloysius",
];

export class BrainstormService {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async generate(mode: BrainstormMode, topic?: string): Promise<BrainstormResult> {
    try {
      return await this.generateAI(mode, topic);
    } catch (error: unknown) {
      const isUnavailable = error instanceof Error && error.name === "AIServiceUnavailableError";
      if (!isUnavailable) {
        console.error("[BrainstormService] Unexpected AI error:", error);
      }
      console.log("[BrainstormService] Falling back to procedural generation");
    }

    return this.generateFallback(mode, topic);
  }

  private async generateAI(mode: BrainstormMode, topic?: string): Promise<BrainstormResult> {
    const prompts: Record<BrainstormMode, string> = {
      character: this.buildCharacterPrompt(topic),
      plot: this.buildPlotPrompt(topic),
      world: this.buildWorldPrompt(topic),
      idea: this.buildIdeaPrompt(topic),
      lore: this.buildLorePrompt(topic),
    };

    const prompt = prompts[mode];

    switch (mode) {
      case "character": {
        const data = await this.aiService.generateJSON<CharacterProfile>(prompt, 0.95);
        return { mode: "character", data };
      }
      case "plot": {
        const data = await this.aiService.generateJSON<PlotHook>(prompt, 0.95);
        return { mode: "plot", data };
      }
      case "world": {
        const data = await this.aiService.generateJSON<WorldBuilding>(prompt, 0.95);
        return { mode: "world", data };
      }
      case "idea": {
        const data = await this.aiService.generateJSON<IdeaSeed>(prompt, 0.9);
        return { mode: "idea", data };
      }
      case "lore": {
        const data = await this.aiService.generateJSON<LoreEntry>(prompt, 0.95);
        return { mode: "lore", data };
      }
    }
  }

  private generateFallback(mode: BrainstormMode, _topic?: string): BrainstormResult {
    switch (mode) {
      case "character":
        return { mode: "character", data: this.randomCharacter() };
      case "plot":
        return { mode: "plot", data: this.randomPlot() };
      case "world":
        return { mode: "world", data: this.randomWorld() };
      case "idea":
        return { mode: "idea", data: this.randomIdea() };
      case "lore":
        return { mode: "lore", data: this.randomLore() };
    }
  }

  private randomCharacter(): CharacterProfile {
    return {
      name: this.pick(NAMES),
      archetype: this.pick(ARCHETYPES),
      motivation: this.pick(MOTIVATIONS),
      flaw: this.pick(FLAWS),
      backstory: `Once ${this.pick(MOTIVATIONS).replace(/^seeks to |^wants to |^is |^needs to |^desires to |^craves |^pursues /, "they ")}. Now, as ${this.pick(ARCHETYPES).toLowerCase()}, they carry the weight of what was lost.`,
      quirk: this.pick(QUIRKS),
    };
  }

  private randomPlot(): PlotHook {
    const years = Math.floor(Math.random() * 100) + 1;
    return {
      title: `${this.pick(["The Last", "Beyond the", "Before the", "After the"])} ${this.pick(["Signal", "Gate", "Silence", "Storm", "Mirror", "Key"])}`,
      genre: this.pick(GENRES),
      premise: this.pick(PREMISES).replace("{years}", String(years)),
      conflict: this.pick(CONFLICTS),
      twist: this.pick(TWISTS),
    };
  }

  private randomWorld(): WorldBuilding {
    return {
      name: `${this.pick(["Vel", "Kor", "Ash", "Sol", "Nyx", "Eld"])}${this.pick(["aria", "mora", "heim", "dale", "spire", "haven"])}`,
      type: this.pick(WORLD_TYPES),
      geography: this.pick(WORLD_TYPES),
      culture: this.pick(CULTURES),
      conflict: this.pick(CONFLICTS),
      secret: `The truth behind it all: ${this.pick(TWISTS).toLowerCase()}.`,
    };
  }

  private randomIdea(): IdeaSeed {
    return {
      concept: `What if ${this.pick(PREMISES).replace("{years}", "50").toLowerCase()}?`,
      tagline: `${this.pick(["In a world where", "When", "After"])} ${this.pick(CULTURES).toLowerCase()}, everything changes.`,
      audience: this.pick([
        "Gen Z dreamers",
        "Indie game devs",
        "Short film makers",
        "Podcast creators",
        "Novel writers",
        "World builders",
      ]),
      uniqueAngle: this.pick(TWISTS),
    };
  }

  private randomLore(): LoreEntry {
    return {
      title: `The ${this.pick(["Chronicle", "Codex", "Fragment", "Tablet", "Scroll"])} of ${this.pick(["Lost", "Forgotten", "Hidden", "Burning", "Silent"])} ${this.pick(["Kings", "Voices", "Stars", "Bones", "Tides"])}`,
      era: this.pick(ERAS),
      event: this.pick(CONFLICTS),
      consequence: `And so the world was never the same. ${this.pick(CULTURES)}`,
      artifact: this.pick(ARTIFACTS),
    };
  }

  private buildCharacterPrompt(topic?: string): string {
    const context = topic ? ` Karakter harus sesuai dengan tema/genre: "${topic}".` : "";
    return [
      `Kamu adalah desainer karakter fiksi ahli.${context}`,
      `Buat profil karakter yang unik dan menarik.`,
      `SEMUA teks (nama, arketipe, motivasi, kelemahan, latar belakang, kebiasaan) HARUS dalam Bahasa Indonesia.`,
      `Return ONLY valid JSON:`,
      `{ "name": "string", "archetype": "string", "motivation": "string", "flaw": "string", "backstory": "string (2-3 kalimat)", "quirk": "string" }`,
    ].join("\n");
  }

  private buildPlotPrompt(topic?: string): string {
    const context = topic ? ` Batasan tema/genre: "${topic}".` : "";
    return [
      `Kamu adalah penulis skenario yang membuat plot hook memikat.${context}`,
      `Buat plot hook yang unik dengan twist yang tidak terduga.`,
      `SEMUA teks (judul, genre, premis, konflik, twist) HARUS dalam Bahasa Indonesia.`,
      `Return ONLY valid JSON:`,
      `{ "title": "string (judul menarik 3-5 kata)", "genre": "string", "premise": "string (2-3 kalimat)", "conflict": "string", "twist": "string" }`,
    ].join("\n");
  }

  private buildWorldPrompt(topic?: string): string {
    const context = topic ? ` Dunia harus mencerminkan tema: "${topic}".` : "";
    return [
      `Kamu adalah arsitek dunia fiksi (fantasy/sci-fi).${context}`,
      `Buat dunia fiksi yang unik dan detail.`,
      `SEMUA teks (nama, tipe, geografi, budaya, konflik, rahasia) HARUS dalam Bahasa Indonesia.`,
      `Return ONLY valid JSON:`,
      `{ "name": "string", "type": "string (deskripsi 1 kalimat)", "geography": "string", "culture": "string (sistem sosial unik)", "conflict": "string", "secret": "string (kebenaran tersembunyi)" }`,
    ].join("\n");
  }

  private buildIdeaPrompt(topic?: string): string {
    const context = topic ? ` Domain/tema: "${topic}".` : "";
    return [
      `Kamu adalah creative director yang sedang brainstorm ide proyek kreatif.${context}`,
      `Buat ide proyek kreatif yang unik (cerita, game, film, produk, aplikasi).`,
      `SEMUA teks (konsep, tagline, audiens, keunikan) HARUS dalam Bahasa Indonesia.`,
      `Return ONLY valid JSON:`,
      `{ "concept": "string (pertanyaan 'bagaimana jika')", "tagline": "string (elevator pitch)", "audience": "string", "uniqueAngle": "string (apa yang membuatnya berbeda)" }`,
    ].join("\n");
  }

  private buildLorePrompt(topic?: string): string {
    const context = topic ? ` Lore harus berada di dunia yang terinspirasi dari: "${topic}".` : "";
    return [
      `Kamu adalah maestro lore yang merancang sejarah kuno fiksi.${context}`,
      `Buat fragmen lore — sebuah peristiwa dari sejarah fiksi.`,
      `SEMUA teks (judul, era, peristiwa, dampak, artefak) HARUS dalam Bahasa Indonesia.`,
      `Return ONLY valid JSON:`,
      `{ "title": "string (nama entri lore)", "era": "string (zaman/era)", "event": "string (apa yang terjadi)", "consequence": "string (dampak yang ditimbulkan)", "artifact": "string (relik yang terkait)" }`,
    ].join("\n");
  }

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  formatResult(result: BrainstormResult): string {
    switch (result.mode) {
      case "character":
        return this.formatCharacter(result.data);
      case "plot":
        return this.formatPlot(result.data);
      case "world":
        return this.formatWorld(result.data);
      case "idea":
        return this.formatIdea(result.data);
      case "lore":
        return this.formatLore(result.data);
    }
  }

  private formatCharacter(c: CharacterProfile): string {
    return [
      `*${S.PERSON} Profil Karakter*`,
      ``,
      `*Nama:* ${c.name}`,
      `*Arketipe:* ${c.archetype}`,
      `*Motivasi:* ${c.motivation}`,
      `*Kelemahan:* ${c.flaw}`,
      `*Kebiasaan Unik:* ${c.quirk}`,
      ``,
      `*Latar Belakang*`,
      `_${c.backstory}_`,
    ].join("\n");
  }

  private formatPlot(p: PlotHook): string {
    return [
      `*${S.BOOK} Plot Hook*`,
      ``,
      `*"${p.title}"*`,
      `Genre: ${p.genre}`,
      ``,
      `*Premis*`,
      `${p.premise}`,
      ``,
      `*Konflik Utama*`,
      `${p.conflict}`,
      ``,
      `*Twist*`,
      `_${p.twist}_`,
    ].join("\n");
  }

  private formatWorld(w: WorldBuilding): string {
    return [
      `*${S.GLOBE} Pembangunan Dunia*`,
      ``,
      `*${w.name}*`,
      `Tipe: ${w.type}`,
      ``,
      `*Geografi*`,
      `${w.geography}`,
      ``,
      `*Budaya*`,
      `${w.culture}`,
      ``,
      `*Konflik*`,
      `${w.conflict}`,
      ``,
      `*Rahasia Tersembunyi*`,
      `_${w.secret}_`,
    ].join("\n");
  }

  private formatIdea(i: IdeaSeed): string {
    return [
      `*${S.SPARK} Ide Kreatif*`,
      ``,
      `*Konsep*`,
      `${i.concept}`,
      ``,
      `*Tagline*`,
      `_"${i.tagline}"_`,
      ``,
      `*Target Audiens:* ${i.audience}`,
      `*Keunikan:* ${i.uniqueAngle}`,
    ].join("\n");
  }

  private formatLore(l: LoreEntry): string {
    return [
      `*${S.SCROLL} Fragmen Lore*`,
      ``,
      `*${l.title}*`,
      `Era: ${l.era}`,
      ``,
      `*Peristiwa*`,
      `${l.event}`,
      ``,
      `*Dampak*`,
      `${l.consequence}`,
      ``,
      `*Artefak*`,
      `_${l.artifact}_`,
    ].join("\n");
  }
}
