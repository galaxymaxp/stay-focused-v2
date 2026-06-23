import type { StructuredOutputSchema } from "./schemas";

export interface GenerationRequest<TOutput> {
  readonly prompt: string;
  readonly schema: StructuredOutputSchema;
  readonly model: string;
  readonly temperature?: number;
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
