/**
 * Curated local model catalog + prompt helpers (safe for client + server).
 */

export const FORUM_AI_KEYS = {
  enabled: "forum_ai_enabled",
  provider: "forum_ai_provider",
  ollamaUrl: "forum_ai_ollama_url",
  ollamaModel: "forum_ai_ollama_model",
  geminiApiKey: "gemini_api_key",
} as const;

export type ForumAiProvider = "off" | "gemini" | "ollama";

export interface LocalModelOption {
  id: string;
  label: string;
  /** Approximate RAM / unified memory when loaded (GiB) */
  ramGb: number;
  /** Rough download size (GiB) */
  downloadGb: number;
  notes: string;
  tier: "light" | "medium" | "heavy";
}

/** Curated Ollama tags with rough memory estimates (Q4-ish defaults). */
export const LOCAL_MODEL_CATALOG: LocalModelOption[] = [
  {
    id: "tinyllama",
    label: "TinyLlama 1.1B",
    ramGb: 1.2,
    downloadGb: 0.6,
    notes: "Fastest / lowest quality. Good for tiny VPS smoke tests.",
    tier: "light",
  },
  {
    id: "gemma2:2b",
    label: "Gemma 2 2B",
    ramGb: 2.0,
    downloadGb: 1.6,
    notes: "Light grammar/polish on ~8GB machines.",
    tier: "light",
  },
  {
    id: "phi3:mini",
    label: "Phi-3 Mini 3.8B",
    ramGb: 2.8,
    downloadGb: 2.2,
    notes: "Solid small model for short forum posts.",
    tier: "light",
  },
  {
    id: "llama3.2:3b",
    label: "Llama 3.2 3B",
    ramGb: 3.2,
    downloadGb: 2.0,
    notes: "Balanced light option.",
    tier: "light",
  },
  {
    id: "mistral:7b",
    label: "Mistral 7B",
    ramGb: 6.0,
    downloadGb: 4.1,
    notes: "Needs ~8GB+ free RAM. Better polish quality.",
    tier: "medium",
  },
  {
    id: "llama3.1:8b",
    label: "Llama 3.1 8B",
    ramGb: 7.5,
    downloadGb: 4.7,
    notes: "Strong general quality; plan for ~16GB host.",
    tier: "medium",
  },
  {
    id: "gemma2:9b",
    label: "Gemma 2 9B",
    ramGb: 8.5,
    downloadGb: 5.4,
    notes: "Heavier; avoid on small VPS.",
    tier: "heavy",
  },
  {
    id: "qwen2.5:14b",
    label: "Qwen 2.5 14B",
    ramGb: 12,
    downloadGb: 8.5,
    notes: "High quality; typically 24GB+ or GPU offload.",
    tier: "heavy",
  },
];

export function getModelOption(id: string): LocalModelOption | undefined {
  return LOCAL_MODEL_CATALOG.find((m) => m.id === id);
}

export function buildEnhancePrompt(text: string, intent: "grammar" | "polish"): string {
  if (intent === "grammar") {
    return `Please fix the grammar and spelling in the following markdown text. Return ONLY the corrected markdown text without any conversational filler or explanation:\n\n${text}`;
  }
  return `Please polish the following markdown text to improve flow, vocabulary, and readability. Keep the core meaning but make it sound professional and engaging. Return ONLY the polished markdown text without any conversational filler or explanation:\n\n${text}`;
}
