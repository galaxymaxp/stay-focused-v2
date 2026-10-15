import type {
  GenerationProvider,
  GenerationRequest,
  StructuredOutputSchema,
} from "@stay-focused/engine";
import OpenAI, { APIConnectionError, APIConnectionTimeoutError, APIUserAbortError } from "openai";
import type { Response, ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

import { REVIEWER_PROVIDER_CALL_TIMEOUT_MS } from "../lib/processing-jobs/constants";

// Each generation call has a provider-level deadline. The durable worker may
// retry a retryable job, but no individual HTTP call may wait indefinitely.
export const OPENAI_PROVIDER_REQUEST_TIMEOUT_MS = REVIEWER_PROVIDER_CALL_TIMEOUT_MS;

export type ProviderFailureKind =
  | "timeout" | "network"
  | "http_error" | "rate_limited"
  | "incomplete" | "empty" | "invalid_json" | "not_object";

export class ProviderCallError extends Error {
  public constructor(
    public readonly kind: ProviderFailureKind,
    public readonly details: { readonly httpStatus?: number; readonly incompleteReason?: string; readonly model: string },
  ) {
    super(`provider_${kind}`);
    this.name = "ProviderCallError";
  }
}

export const PROVIDER_OUTCOME_UNKNOWN: ReadonlySet<ProviderFailureKind> = new Set(["timeout", "network"]);

export interface OpenAIJsonSchemaFormat {
  readonly type: "json_schema";
  readonly name: string;
  readonly description: string;
  readonly schema: StructuredOutputSchema["schema"];
  readonly strict: true;
}

export interface OpenAITextFormat {
  readonly format: OpenAIJsonSchemaFormat;
}

export interface OpenAIResponsesCreateRequest {
  readonly instructions?: string;
  readonly max_output_tokens?: number;
  readonly model: string;
  readonly input: string | { role: 'user'; content: ({ type: 'input_text'; text: string } | { type: 'input_image'; image_url: string; detail: 'low' })[] }[];
  readonly temperature?: number;
  readonly reasoning?: { readonly effort: "low" | "medium" | "high" };
  readonly text: OpenAITextFormat;
}

export interface OpenAIOutputTextItem {
  readonly type?: string;
  readonly text?: string;
  readonly content?: readonly OpenAIOutputTextItem[];
}

export interface OpenAIResponsesCreateResponse {
  readonly status?: Response["status"];
  readonly incomplete_details?: Response["incomplete_details"];
  readonly output_text?: string;
  readonly output?: readonly OpenAIOutputTextItem[];
}

export interface OpenAIResponsesClient {
  readonly responses: {
    create(
      request: OpenAIResponsesCreateRequest,
    ): Promise<OpenAIResponsesCreateResponse>;
  };
}

export interface OpenAIProviderOptions {
  readonly client: OpenAIResponsesClient;
  readonly defaultModel?: string;
}

export interface OpenAIProviderEnvironment {
  readonly OPENAI_API_KEY?: string;
}

export type OpenAIResponsesClientFactory = (
  apiKey: string,
) => OpenAIResponsesClient;

export interface CreateServerOpenAIProviderOptions {
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly defaultModel?: string;
  readonly environment?: OpenAIProviderEnvironment;
  readonly clientFactory?: OpenAIResponsesClientFactory;
}

export class OpenAIProvider implements GenerationProvider {
  private readonly client: OpenAIResponsesClient;
  private readonly defaultModel: string;

  public constructor(options: OpenAIProviderOptions) {
    if (
      !options?.client ||
      typeof options.client.responses?.create !== "function"
    ) {
      throw new Error("OpenAIProvider requires a client.");
    }

    this.client = options.client;
    this.defaultModel = readNonEmptyString(options.defaultModel) ?? "gpt-4o";
  }

  public async generate<TOutput>(
    request: GenerationRequest<TOutput>,
  ): Promise<TOutput> {
    return this.generateResponse(request);
  }

  /** Vision stays on the same typed Responses adapter, key and error boundary. */
  public async generateWithImage<TOutput>(request: GenerationRequest<TOutput>, imageUrl: string): Promise<TOutput> {
    return this.generateWithImages(request, [imageUrl]);
  }

  /** Several labeled candidates in one call; accepts Commons URLs or inline image data fetched by the API. */
  public async generateWithImages<TOutput>(request: GenerationRequest<TOutput>, imageUrls: readonly string[]): Promise<TOutput> {
    if (!imageUrls.length || imageUrls.length > 8) throw new Error('invalid_vision_image');
    const safe = imageUrls.map(imageUrl => {
      if (/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(imageUrl)) return imageUrl;
      const url = new URL(imageUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'upload.wikimedia.org' || url.username || url.password || url.port) {
        throw new Error('invalid_vision_image');
      }
      return url.href;
    });
    return this.generateResponse(request, safe);
  }

  private async generateResponse<TOutput>(request: GenerationRequest<TOutput>, imageUrls?: readonly string[]): Promise<TOutput> {
    if (!request || typeof request !== "object") {
      throw new Error("OpenAIProvider.generate requires a request.");
    }

    const prompt = readNonEmptyString(request.prompt);
    if (!prompt) {
      throw new Error("OpenAIProvider.generate requires a prompt.");
    }
    if (!isStructuredOutputSchema(request.schema)) {
      throw new Error("OpenAIProvider.generate requires a schema.");
    }

    const model = readNonEmptyString(request.model) ?? this.defaultModel;
    const openAIRequest: OpenAIResponsesCreateRequest = {
      model,
      input: imageUrls?.length ? [{ role: 'user', content: [{ type: 'input_text', text: prompt }, ...imageUrls.map(image_url => ({ type: 'input_image' as const, image_url, detail: 'low' as const }))] }] : prompt,
      ...(request.instructions ? { instructions: request.instructions } : {}),
      ...(request.maxOutputTokens ? { max_output_tokens: request.maxOutputTokens } : {}),
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
      ...(request.reasoningEffort ? { reasoning: { effort: request.reasoningEffort } } : {}),
      text: {
        format: {
          type: "json_schema",
          name: request.schema.name,
          description: request.schema.description,
          schema: request.schema.schema,
          strict: true,
        },
      },
    };

    let response: OpenAIResponsesCreateResponse;
    try {
      response = await this.client.responses.create(openAIRequest);
    } catch (error) {
      if (error instanceof APIConnectionTimeoutError || error instanceof APIUserAbortError ||
          (error instanceof Error && error.name === "AbortError")) {
        throw new ProviderCallError("timeout", { model });
      }
      if (error instanceof APIConnectionError) throw new ProviderCallError("network", { model });
      if (isRecord(error) && typeof error.status === "number") {
        throw new ProviderCallError(error.status === 429 ? "rate_limited" : "http_error", { model, httpStatus: error.status });
      }
      throw new ProviderCallError("network", { model });
    }

    if (response.status === "incomplete") {
      const reason = response.incomplete_details?.reason;
      throw new ProviderCallError("incomplete", {
        model,
        ...(reason === "max_output_tokens" || reason === "content_filter" ? { incompleteReason: reason } : {}),
      });
    }

    const outputText = extractOutputText(response);
    if (!outputText) {
      throw new ProviderCallError("empty", { model });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new ProviderCallError("invalid_json", { model });
    }

    if (!isRecord(parsed)) {
      throw new ProviderCallError("not_object", { model });
    }

    return parsed as TOutput;
  }
}

export function createServerOpenAIProvider(
  options: CreateServerOpenAIProviderOptions = {},
): OpenAIProvider {
  const environment = options.environment ?? process.env;
  const apiKey = readNonEmptyString(environment.OPENAI_API_KEY);
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required to create the server OpenAI provider.",
    );
  }

  const clientFactory = options.clientFactory ?? ((key: string) => createOpenAIResponsesClient(key, options.timeoutMs, options.maxRetries));
  return new OpenAIProvider({
    client: clientFactory(apiKey),
    defaultModel: options.defaultModel,
  });
}

function createOpenAIResponsesClient(apiKey: string, timeoutMs = OPENAI_PROVIDER_REQUEST_TIMEOUT_MS, maxRetries = 1): OpenAIResponsesClient {
  const client = new OpenAI({
    apiKey,
    timeout: timeoutMs,
    maxRetries,
  });

  return {
    responses: {
      create: async (
        request: OpenAIResponsesCreateRequest,
      ): Promise<OpenAIResponsesCreateResponse> => {
        const sdkRequest: ResponseCreateParamsNonStreaming = {
          model: request.model,
          input: request.input,
          ...(request.instructions ? { instructions: request.instructions } : {}),
          ...(request.max_output_tokens ? { max_output_tokens: request.max_output_tokens } : {}),
          text: {
            format: {
              type: request.text.format.type,
              name: request.text.format.name,
              description: request.text.format.description,
              schema: request.text.format.schema,
              strict: request.text.format.strict,
            },
          },
          ...(request.temperature !== undefined
            ? { temperature: request.temperature }
            : {}),
          ...(request.reasoning ? { reasoning: { effort: request.reasoning.effort } } : {}),
        };
        const response = await client.responses.create(sdkRequest);
        return { output_text: response.output_text, status: response.status, incomplete_details: response.incomplete_details };
      },
    },
  };
}

function extractOutputText(
  response: OpenAIResponsesCreateResponse | undefined,
): string | undefined {
  if (!response || typeof response !== "object") {
    return undefined;
  }

  const directText = readNonEmptyString(response.output_text);
  if (directText) {
    return directText;
  }

  for (const item of response.output ?? []) {
    const itemText = readOutputItemText(item);
    if (itemText) {
      return itemText;
    }
  }
  return undefined;
}

function readOutputItemText(item: OpenAIOutputTextItem): string | undefined {
  if (item.type === "output_text") {
    const text = readNonEmptyString(item.text);
    if (text) {
      return text;
    }
  }

  for (const contentItem of item.content ?? []) {
    const text = readOutputItemText(contentItem);
    if (text) {
      return text;
    }
  }
  return undefined;
}

function isStructuredOutputSchema(
  value: unknown,
): value is StructuredOutputSchema {
  return (
    isRecord(value) &&
    readNonEmptyString(value.name) !== undefined &&
    typeof value.description === "string" &&
    isRecord(value.schema)
  );
}

function readNonEmptyString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
