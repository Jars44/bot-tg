import { GoogleGenAI } from "@google/genai";
import { CONFIG, getEnvVar, ENV_KEYS } from "../config/index.js";

export class AIServiceUnavailableError extends Error {
  constructor(reason: string) {
    super(`AI Service unavailable: ${reason}`);
    this.name = "AIServiceUnavailableError";
  }
}

type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  requestTimeoutMs: number;
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 30_000,
  requestTimeoutMs: 5_000,
};

export class AIService {
  private genAI: GoogleGenAI;
  private circuitState: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    const apiKey = getEnvVar(ENV_KEYS.GEMINI_API_KEY);
    this.genAI = new GoogleGenAI({ apiKey });
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  async generate(prompt: string, temperature = 0.9, maxTokens = 1024): Promise<string> {
    this.checkCircuit();

    try {
      const result = await this.executeWithTimeout(prompt, temperature, maxTokens);
      this.onSuccess();
      return result;
    } catch (error: unknown) {
      this.onFailure();

      if (error instanceof AIServiceUnavailableError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);

      if (this.isTransientError(message)) {
        throw new AIServiceUnavailableError(message);
      }

      throw new AIServiceUnavailableError(message);
    }
  }

  async generateJSON<T>(prompt: string, temperature = 0.7): Promise<T> {
    const raw = await this.generate(prompt, temperature, 2048);

    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
    const jsonStr = (jsonMatch[1] ?? raw).trim();

    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      throw new AIServiceUnavailableError("Failed to parse AI response as JSON");
    }
  }

  private checkCircuit(): void {
    if (this.circuitState === "open") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.resetTimeoutMs) {
        this.circuitState = "half-open";
        console.log("[AIService] Circuit breaker → half-open (attempting recovery)");
      } else {
        throw new AIServiceUnavailableError(
          `Circuit breaker open. Retrying in ${Math.ceil((this.config.resetTimeoutMs - elapsed) / 1000)}s`,
        );
      }
    }
  }

  private onSuccess(): void {
    if (this.circuitState === "half-open") {
      console.log("[AIService] Circuit breaker → closed (recovered)");
    }
    this.circuitState = "closed";
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.circuitState = "open";
      console.warn(
        `[AIService] Circuit breaker → open after ${this.failureCount} failures. ` +
          `Will retry in ${this.config.resetTimeoutMs / 1000}s`,
      );
    }
  }

  private isTransientError(message: string): boolean {
    const transientPatterns = ["500", "502", "503", "504", "timeout", "ETIMEDOUT", "ECONNRESET", "ECONNABORTED"];
    return transientPatterns.some((p) => message.toLowerCase().includes(p.toLowerCase()));
  }

  private async executeWithTimeout(prompt: string, temperature: number, maxTokens: number): Promise<string> {
    const timeoutMs = this.config.requestTimeoutMs;

    const resultPromise = this.genAI.models.generateContent({
      model: CONFIG.AI.MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    });

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      setTimeout(() => reject(new AIServiceUnavailableError("Request timed out")), timeoutMs);
    });

    const result = await Promise.race([resultPromise, timeoutPromise]);

    const text = result.text ?? "";
    if (!text) {
      throw new AIServiceUnavailableError("Empty response from AI");
    }

    return text;
  }
}
