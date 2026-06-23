import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";

import type { GenerationProvider, GenerationRequest } from "../provider.js";
import type { StructuredOutputSchema } from "../schemas.js";

const DEFAULT_MODEL = "gpt-4o";

export type OpenAIProviderErrorCode =
  | "missing-api-key"
  | "api-error"
  | "missing-choice"
  | "refusal"
  | "missing-content"
  | "invalid-json"
  | "schema-validation";

export class OpenAIProviderError extends Error {
  readonly code: OpenAIProviderErrorCode;
  readonly schemaName?: string;

  constructor(
    code: OpenAIProviderErrorCode,
    message: string,
    options?: Readonly<{ schemaName?: string }>,
  ) {
    super(message);
    this.name = "OpenAIProviderError";
    this.code = code;
    this.schemaName = options?.schemaName;
  }
}

export function createOpenAIGenerationProvider(): GenerationProvider {
  return {
    async generate<TOutput>(
      request: GenerationRequest<TOutput>,
    ): Promise<TOutput> {
      const apiKey = readOpenAIAPIKey(request.schema.name);
      const client = new OpenAI({ apiKey });

      const completion = await createCompletion(client, request);
      const content = readCompletionContent(completion, request.schema.name);
      const parsed = parseJSONContent(content, request.schema.name);

      validateStructuredOutput(parsed, request.schema);
      return parsed as TOutput;
    },
  };
}

async function createCompletion<TOutput>(
  client: OpenAI,
  request: GenerationRequest<TOutput>,
): Promise<ChatCompletion> {
  const params: ChatCompletionCreateParamsNonStreaming = {
    model: readModel(request.model),
    messages: [{ role: "user", content: request.prompt }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: request.schema.name,
        description: request.schema.description,
        strict: true,
        schema: toOpenAIJSONSchema(request.schema.schema),
      },
    },
  };

  if (request.temperature !== undefined) {
    params.temperature = request.temperature;
  }

  try {
    return await client.chat.completions.create(params);
  } catch (error) {
    throw new OpenAIProviderError(
      "api-error",
      `OpenAI provider request failed: ${errorMessage(error)}`,
      { schemaName: request.schema.name },
    );
  }
}

function readOpenAIAPIKey(schemaName: string): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new OpenAIProviderError(
      "missing-api-key",
      "OpenAI provider requires OPENAI_API_KEY.",
      { schemaName },
    );
  }

  return apiKey;
}

function readModel(model: string): string {
  return model.trim().length > 0 ? model : DEFAULT_MODEL;
}

function readCompletionContent(
  completion: ChatCompletion,
  schemaName: string,
): string {
  const [choice] = completion.choices;
  if (!choice) {
    throw new OpenAIProviderError(
      "missing-choice",
      `OpenAI response for schema "${schemaName}" did not include a choice.`,
      { schemaName },
    );
  }

  const { message } = choice;
  if (typeof message.refusal === "string" && message.refusal.length > 0) {
    throw new OpenAIProviderError(
      "refusal",
      `OpenAI refused to generate schema "${schemaName}".`,
      { schemaName },
    );
  }

  if (typeof message.content !== "string" || message.content.length === 0) {
    throw new OpenAIProviderError(
      "missing-content",
      `OpenAI response for schema "${schemaName}" did not include JSON content.`,
      { schemaName },
    );
  }

  return message.content;
}

function parseJSONContent(content: string, schemaName: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch (error) {
    throw new OpenAIProviderError(
      "invalid-json",
      `OpenAI response for schema "${schemaName}" was not valid JSON: ${errorMessage(error)}`,
      { schemaName },
    );
  }
}

function validateStructuredOutput(
  output: unknown,
  schema: StructuredOutputSchema,
): void {
  validateValue(output, schema.schema, "$", schema.name);
}

function validateValue(
  value: unknown,
  schemaNode: unknown,
  path: string,
  schemaName: string,
): void {
  if (!isRecord(schemaNode)) {
    throwSchemaValidationError(path, "schema node must be an object", schemaName);
  }

  const expectedConst = schemaNode["const"];
  if (expectedConst !== undefined && value !== expectedConst) {
    throwSchemaValidationError(
      path,
      `expected const value ${JSON.stringify(expectedConst)}`,
      schemaName,
    );
  }

  const expectedType = schemaNode["type"];
  if (expectedType === "object") {
    validateObject(value, schemaNode, path, schemaName);
    return;
  }

  if (expectedType === "array") {
    validateArray(value, schemaNode, path, schemaName);
    return;
  }

  if (expectedType === "string") {
    validateString(value, schemaNode, path, schemaName);
    return;
  }
}

function validateObject(
  value: unknown,
  schemaNode: Readonly<Record<string, unknown>>,
  path: string,
  schemaName: string,
): void {
  if (!isRecord(value)) {
    throwSchemaValidationError(path, "expected object", schemaName);
  }

  const properties = schemaNode["properties"];
  if (!isRecord(properties)) {
    throwSchemaValidationError(path, "object schema requires properties", schemaName);
  }

  const required = schemaNode["required"];
  if (!isReadonlyStringArray(required)) {
    throwSchemaValidationError(path, "object schema requires required fields", schemaName);
  }

  for (const field of required) {
    if (!hasOwn(value, field)) {
      throwSchemaValidationError(
        `${path}.${field}`,
        "missing required field",
        schemaName,
      );
    }
  }

  if (schemaNode["additionalProperties"] === false) {
    for (const field of Object.keys(value)) {
      if (!hasOwn(properties, field)) {
        throwSchemaValidationError(
          `${path}.${field}`,
          "unexpected additional property",
          schemaName,
        );
      }
    }
  }

  for (const [field, fieldSchema] of Object.entries(properties)) {
    if (hasOwn(value, field)) {
      validateValue(value[field], fieldSchema, `${path}.${field}`, schemaName);
    }
  }
}

function validateArray(
  value: unknown,
  schemaNode: Readonly<Record<string, unknown>>,
  path: string,
  schemaName: string,
): void {
  if (!Array.isArray(value)) {
    throwSchemaValidationError(path, "expected array", schemaName);
  }

  const minItems = schemaNode["minItems"];
  if (
    typeof minItems === "number" &&
    Number.isInteger(minItems) &&
    value.length < minItems
  ) {
    throwSchemaValidationError(
      path,
      `expected at least ${minItems} item(s)`,
      schemaName,
    );
  }

  const itemSchema = schemaNode["items"];
  if (itemSchema !== undefined) {
    value.forEach((item, index) => {
      validateValue(item, itemSchema, `${path}[${index}]`, schemaName);
    });
  }
}

function validateString(
  value: unknown,
  schemaNode: Readonly<Record<string, unknown>>,
  path: string,
  schemaName: string,
): void {
  if (typeof value !== "string") {
    throwSchemaValidationError(path, "expected string", schemaName);
  }

  const minLength = schemaNode["minLength"];
  if (
    typeof minLength === "number" &&
    Number.isInteger(minLength) &&
    value.length < minLength
  ) {
    throwSchemaValidationError(
      path,
      `expected string length at least ${minLength}`,
      schemaName,
    );
  }
}

function throwSchemaValidationError(
  path: string,
  detail: string,
  schemaName: string,
): never {
  throw new OpenAIProviderError(
    "schema-validation",
    `OpenAI response for schema "${schemaName}" failed validation at ${path}: ${detail}.`,
    { schemaName },
  );
}

function toOpenAIJSONSchema(
  schema: StructuredOutputSchema["schema"],
): { [key: string]: unknown } {
  return {
    type: schema.type,
    additionalProperties: schema.additionalProperties,
    required: [...schema.required],
    properties: schema.properties,
  };
}

function isReadonlyStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === "string")
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(
  value: Readonly<Record<string, unknown>>,
  key: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
