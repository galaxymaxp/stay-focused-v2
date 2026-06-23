import assert from "node:assert/strict";
import { after, beforeEach, mock, test } from "node:test";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";

import type { GenerationRequest } from "../provider.js";
import { conceptCardSchema } from "../schemas.js";
import type { SectionOutput } from "../types.js";

declare module "node:test" {
  namespace test {
    interface MockModuleOptions {
      readonly exports?: Readonly<Record<string, unknown>>;
    }
  }
}

const originalOpenAIAPIKey = process.env.OPENAI_API_KEY;

const validConceptCard: SectionOutput = {
  kind: "concept-card",
  id: "section-output-1",
  plannedSectionId: "planned-section-1",
  title: "Focused attention",
  sourceCore: {
    explanation: "Focused attention is sustained effort on one task.",
    keyPoints: ["Limit interruptions", "Use short review intervals"],
  },
  enrichment: null,
  sourceBlockIds: ["source-block-1"],
};

const request: GenerationRequest<SectionOutput> = {
  prompt: "Generate one concept card.",
  schema: conceptCardSchema,
  model: "gpt-test-model",
  temperature: 0.2,
};

const sdkCalls: ChatCompletionCreateParamsNonStreaming[] = [];
const constructedAPIKeys: string[] = [];

let sdkResponse: ChatCompletion = completionWithContent(
  JSON.stringify(validConceptCard),
);

class MockOpenAI {
  readonly chat = {
    completions: {
      create: async (
        params: ChatCompletionCreateParamsNonStreaming,
      ): Promise<ChatCompletion> => {
        sdkCalls.push(params);
        return sdkResponse;
      },
    },
  };

  constructor(options: Readonly<{ apiKey: string }>) {
    constructedAPIKeys.push(options.apiKey);
  }
}

mock.module("openai", {
  cache: true,
  exports: { default: MockOpenAI },
});

const { OpenAIProviderError, createOpenAIGenerationProvider } = await import(
  "./openai-provider.js"
);

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-api-key";
  sdkCalls.length = 0;
  constructedAPIKeys.length = 0;
  sdkResponse = completionWithContent(JSON.stringify(validConceptCard));
});

after(() => {
  if (originalOpenAIAPIKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAIAPIKey;
  }
  mock.reset();
});

test("sends json_schema strict true with the request schema and parses output", async () => {
  const provider = createOpenAIGenerationProvider();
  const output = await provider.generate<SectionOutput>(request);

  assert.deepEqual(output, validConceptCard);
  assert.deepEqual(constructedAPIKeys, ["test-api-key"]);
  assert.equal(sdkCalls.length, 1);

  const sentRequest = readOnlyCall();
  assert.equal(sentRequest.model, request.model);
  assert.equal(sentRequest.temperature, request.temperature);
  assert.deepEqual(sentRequest.messages, [
    { role: "user", content: request.prompt },
  ]);

  const responseFormat = sentRequest.response_format;
  assert.ok(responseFormat);
  assert.equal(responseFormat.type, "json_schema");

  if (responseFormat.type !== "json_schema") {
    assert.fail("Expected json_schema response_format.");
  }

  assert.equal(responseFormat.json_schema.name, request.schema.name);
  assert.equal(
    responseFormat.json_schema.description,
    request.schema.description,
  );
  assert.equal(responseFormat.json_schema.strict, true);
  assert.deepEqual(responseFormat.json_schema.schema, request.schema.schema);
});

test("throws a typed error for schema-invalid content", async () => {
  const provider = createOpenAIGenerationProvider();
  sdkResponse = completionWithContent(
    JSON.stringify({
      ...validConceptCard,
      sourceCore: {
        ...validConceptCard.sourceCore,
        keyPoints: [],
      },
    }),
  );

  await assert.rejects(
    provider.generate<SectionOutput>(request),
    isOpenAIProviderError("schema-validation"),
  );
});

test("throws a typed error for a refusal response", async () => {
  const provider = createOpenAIGenerationProvider();
  sdkResponse = completionWithMessage({
    content: null,
    refusal: "I cannot comply with this request.",
  });

  await assert.rejects(
    provider.generate<SectionOutput>(request),
    isOpenAIProviderError("refusal"),
  );
});

function completionWithContent(content: string): ChatCompletion {
  return completionWithMessage({ content, refusal: null });
}

function completionWithMessage(
  message: Readonly<{ content: string | null; refusal: string | null }>,
): ChatCompletion {
  return {
    id: "chatcmpl-test",
    choices: [
      {
        finish_reason: "stop",
        index: 0,
        logprobs: null,
        message: {
          content: message.content,
          refusal: message.refusal,
          role: "assistant",
        },
      },
    ],
    created: 1,
    model: "gpt-test-model",
    object: "chat.completion",
  };
}

function readOnlyCall(): ChatCompletionCreateParamsNonStreaming {
  const [call] = sdkCalls;
  if (!call) {
    assert.fail("Expected OpenAI SDK to receive one request.");
  }
  return call;
}

function isOpenAIProviderError(
  code: string,
): (error: unknown) => boolean {
  return (error: unknown): boolean =>
    error instanceof OpenAIProviderError && error.code === code;
}
