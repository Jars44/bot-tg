/**
 * Brainstorm Service — The Creative Engine
 * Infinite generation for writers and builders.
 *
 * Primary: AI-generated creative content (character profiles, plot hooks, world building)
 * Fallback: "Mad Libs" style RNG engine with structured templates
 */

import type { AIService } from "./GenAIService.js";

// ─── Types ────────────────────────────────────────────────────

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

// ─── Fallback Templates ──────────────────────────────────────

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

// ─── Service ──────────────────────────────────────────────────

export class BrainstormService {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  /**
   * Generate creative content for the given mode and optional topic.
   */
  async generate(mode: BrainstormMode, topic?: string): Promise<BrainstormResult> {
    // Primary: AI generation
    try {
      return await this.generateAI(mode, topic);
    } catch (error: unknown) {
      const isUnavailable = error instanceof Error && error.name === "AIServiceUnavailableError";
      if (!isUnavailable) {
        console.error("[BrainstormService] Unexpected AI error:", error);
      }
      console.log("[BrainstormService] Falling back to procedural generation");
    }

    // Fallback: Procedural
    return this.generateFallback(mode, topic);
  }

  // ─── AI Path ──────────────────────────────────────────────

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

  // ─── Fallback Path ────────────────────────────────────────

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

  // ─── Prompt Builders ──────────────────────────────────────

  private buildCharacterPrompt(topic?: string): string {
    const context = topic ? ` The character should fit the theme/genre: "${topic}".` : "";
    return [
      `You are a master character designer for fiction.${context}`,
      `Generate a unique, compelling character profile.`,
      `Return ONLY valid JSON:`,
      `{ "name": "string", "archetype": "string", "motivation": "string", "flaw": "string", "backstory": "string (2-3 sentences)", "quirk": "string" }`,
    ].join("\n");
  }

  private buildPlotPrompt(topic?: string): string {
    const context = topic ? ` Theme/genre constraint: "${topic}".` : "";
    return [
      `You are a screenplay writer creating compelling story hooks.${context}`,
      `Generate a unique plot hook with an unexpected twist.`,
      `Return ONLY valid JSON:`,
      `{ "title": "string (catchy 3-5 words)", "genre": "string", "premise": "string (2-3 sentences)", "conflict": "string", "twist": "string" }`,
    ].join("\n");
  }

  private buildWorldPrompt(topic?: string): string {
    const context = topic ? ` The world should reflect the theme: "${topic}".` : "";
    return [
      `You are a fantasy/sci-fi world architect.${context}`,
      `Generate a unique fictional world or setting.`,
      `Return ONLY valid JSON:`,
      `{ "name": "string", "type": "string (1 sentence description)", "geography": "string", "culture": "string (unique social system)", "conflict": "string", "secret": "string (hidden truth)" }`,
    ].join("\n");
  }

  private buildIdeaPrompt(topic?: string): string {
    const context = topic ? ` Domain/theme: "${topic}".` : "";
    return [
      `You are a creative director brainstorming project ideas.${context}`,
      `Generate a unique creative project idea (story, game, film, product, app).`,
      `Return ONLY valid JSON:`,
      `{ "concept": "string (what-if question)", "tagline": "string (elevator pitch)", "audience": "string", "uniqueAngle": "string (what makes it different)" }`,
    ].join("\n");
  }

  private buildLorePrompt(topic?: string): string {
    const context = topic ? ` The lore should exist in a world inspired by: "${topic}".` : "";
    return [
      `You are a lore master crafting ancient histories.${context}`,
      `Generate a fragment of lore — an event from a fictional history.`,
      `Return ONLY valid JSON:`,
      `{ "title": "string (name of the lore entry)", "era": "string (what age/era)", "event": "string (what happened)", "consequence": "string (what it caused)", "artifact": "string (a relic tied to this event)" }`,
    ].join("\n");
  }

  // ─── Helpers ──────────────────────────────────────────────

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Format a brainstorm result into a Telegram message.
   */
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
      `*Character Profile*`,
      ``,
      `*Name:* ${c.name}`,
      `*Archetype:* ${c.archetype}`,
      `*Motivation:* ${c.motivation}`,
      `*Fatal Flaw:* ${c.flaw}`,
      `*Quirk:* ${c.quirk}`,
      ``,
      `*Backstory*`,
      `_${c.backstory}_`,
    ].join("\n");
  }

  private formatPlot(p: PlotHook): string {
    return [
      `*Plot Hook*`,
      ``,
      `*"${p.title}"*`,
      `Genre: ${p.genre}`,
      ``,
      `*Premise*`,
      `${p.premise}`,
      ``,
      `*Central Conflict*`,
      `${p.conflict}`,
      ``,
      `*Twist*`,
      `_${p.twist}_`,
    ].join("\n");
  }

  private formatWorld(w: WorldBuilding): string {
    return [
      `*World Building*`,
      ``,
      `*${w.name}*`,
      `Type: ${w.type}`,
      ``,
      `*Geography*`,
      `${w.geography}`,
      ``,
      `*Culture*`,
      `${w.culture}`,
      ``,
      `*Conflict*`,
      `${w.conflict}`,
      ``,
      `*Hidden Truth*`,
      `_${w.secret}_`,
    ].join("\n");
  }

  private formatIdea(i: IdeaSeed): string {
    return [
      `*Creative Idea*`,
      ``,
      `*Concept*`,
      `${i.concept}`,
      ``,
      `*Tagline*`,
      `_"${i.tagline}"_`,
      ``,
      `*Target Audience:* ${i.audience}`,
      `*Unique Angle:* ${i.uniqueAngle}`,
    ].join("\n");
  }

  private formatLore(l: LoreEntry): string {
    return [
      `*Lore Fragment*`,
      ``,
      `*${l.title}*`,
      `Era: ${l.era}`,
      ``,
      `*The Event*`,
      `${l.event}`,
      ``,
      `*The Consequence*`,
      `${l.consequence}`,
      ``,
      `*Artifact*`,
      `_${l.artifact}_`,
    ].join("\n");
  }
}
