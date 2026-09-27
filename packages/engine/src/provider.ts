import type { StructuredOutputSchema } from "./schemas";

export interface GenerationRequest<TOutput> {
  readonly instructions?: string;
  readonly maxOutputTokens?: number;
  readonly prompt: string;
  readonly schema: StructuredOutputSchema;
  readonly model: string;
  readonly temperature?: number;
  /** Lower effort for short, low-stakes outputs; omitted uses the model default. */
  readonly reasoningEffort?: "low" | "medium" | "high";
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GenerationProvider {
  generate<TOutput>(request: GenerationRequest<TOutput>): Promise<TOutput>;
}

export {
  OpenAIProviderError,
  createOpenAIGenerationProvider,
} from "./providers/openai-provider.js";
export type { OpenAIProviderErrorCode } from "./providers/openai-provider.js";
