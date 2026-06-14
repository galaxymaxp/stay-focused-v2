import type {
  GenerationProvider,
  GenerationRequest,
  StructuredOutputSchema,
} from "@stay-focused/engine";

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
  readonly model: string;
  readonly input: string;
  readonly temperature?: number;
  readonly text: OpenAITextFormat;
}

export interface OpenAIOutputTextItem {
  readonly type?: string;
  readonly text?: string;
  readonly content?: readonly OpenAIOutputTextItem[];
}

export interface OpenAIResponsesCreateResponse {
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
      input: prompt,
      ...(request.temperature !== undefined
        ? { temperature: request.temperature }
        : {}),
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
      throw new Error(
        `OpenAI provider request failed for model "${model}": ${errorMessage(error)}`,
      );
    }

    const outputText = extractOutputText(response);
    if (!outputText) {
      throw new Error("OpenAIProvider received an empty response.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new Error("OpenAIProvider received invalid JSON output.");
    }

    if (!isRecord(parsed)) {
      throw new Error("OpenAIProvider received JSON output that is not an object.");
    }

    return parsed as TOutput;
  }
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
