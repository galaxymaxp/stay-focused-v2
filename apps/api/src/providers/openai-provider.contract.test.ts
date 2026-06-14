import type {
  GenerationRequest,
  StructuredOutputSchema,
} from "@stay-focused/engine";

import {
  createServerOpenAIProvider,
  OpenAIProvider,
  type OpenAIResponsesClient,
  type OpenAIResponsesCreateRequest,
  type OpenAIResponsesCreateResponse,
} from "./openai-provider.js";

interface ContractCheck {
  readonly name: string;
  readonly run: () => Promise<void>;
}

export interface OpenAIProviderContractResult {
  readonly passed: number;
  readonly failed: number;
}

const testSchema: StructuredOutputSchema = {
  name: "ContractOutput",
  description: "Contract-test structured output.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["value"],
    properties: {
      value: { type: "string" },
    },
  },
};

const checks: readonly ContractCheck[] = [
  {
    name: "maps prompt to input",
    run: async () => {
      const client = new FakeClient({ output_text: '{"value":"ok"}' });
      await new OpenAIProvider({ client }).generate(createRequest());
      assertEqual(client.lastRequest?.input, "Generate contract output.");
    },
  },
  {
    name: "maps schema to text format",
    run: async () => {
      const client = new FakeClient({ output_text: '{"value":"ok"}' });
      await new OpenAIProvider({ client }).generate(createRequest());
      assertEqual(client.lastRequest?.text.format.type, "json_schema");
      assertEqual(client.lastRequest?.text.format.name, testSchema.name);
      assertDeepEqual(client.lastRequest?.text.format.schema, testSchema.schema);
    },
  },
  {
    name: "uses strict JSON Schema output",
    run: async () => {
      const client = new FakeClient({ output_text: '{"value":"ok"}' });
      await new OpenAIProvider({ client }).generate(createRequest());
      assertEqual(client.lastRequest?.text.format.strict, true);
    },
  },
  {
    name: "uses default gpt-4o model when request model is missing",
    run: async () => {
      const client = new FakeClient({ output_text: '{"value":"ok"}' });
      const request = {
        ...createRequest(),
        model: undefined,
      } as unknown as GenerationRequest<unknown>;
      await new OpenAIProvider({ client }).generate(request);
      assertEqual(client.lastRequest?.model, "gpt-4o");
    },
  },
  {
    name: "server factory requires OPENAI_API_KEY",
    run: async () => {
      let clientFactoryCalls = 0;
      expectError(
        () =>
          createServerOpenAIProvider({
            environment: {},
            clientFactory: () => {
              clientFactoryCalls += 1;
              return new FakeClient({ output_text: '{"value":"ok"}' });
            },
          }),
        "OPENAI_API_KEY is required to create the server OpenAI provider.",
      );
      assertEqual(clientFactoryCalls, 0);
    },
  },
  {
    name: "server factory supports fake clients without constructing SDK client",
    run: async () => {
      const client = new FakeClient({ output_text: '{"value":"ok"}' });
      let clientFactoryCalls = 0;
      const provider = createServerOpenAIProvider({
        environment: { OPENAI_API_KEY: "contract-key" },
        clientFactory: (apiKey) => {
          clientFactoryCalls += 1;
          assertEqual(apiKey, "contract-key");
          return client;
        },
      });
      const request = {
        ...createRequest(),
        model: undefined,
      } as unknown as GenerationRequest<unknown>;

      await provider.generate(request);
      assertEqual(clientFactoryCalls, 1);
      assertEqual(client.lastRequest?.model, "gpt-4o");
    },
  },
  {
    name: "uses request model when provided",
    run: async () => {
      const client = new FakeClient({ output_text: '{"value":"ok"}' });
      await new OpenAIProvider({ client }).generate(
        createRequest({ model: "gpt-contract" }),
      );
      assertEqual(client.lastRequest?.model, "gpt-contract");
    },
  },
  {
    name: "passes temperature when provided",
    run: async () => {
      const client = new FakeClient({ output_text: '{"value":"ok"}' });
      await new OpenAIProvider({ client }).generate(
        createRequest({ temperature: 0.2 }),
      );
      assertEqual(client.lastRequest?.temperature, 0.2);
    },
  },
  {
    name: "parses output_text JSON",
    run: async () => {
      const provider = new OpenAIProvider({
        client: new FakeClient({ output_text: '{"value":"direct"}' }),
      });
      const output = await provider.generate<{ readonly value: string }>(
        createRequest(),
      );
      assertEqual(output.value, "direct");
    },
  },
  {
    name: "parses output array JSON",
    run: async () => {
      const provider = new OpenAIProvider({
        client: new FakeClient({
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: '{"value":"array"}' }],
            },
          ],
        }),
      });
      const output = await provider.generate<{ readonly value: string }>(
        createRequest(),
      );
      assertEqual(output.value, "array");
    },
  },
  {
    name: "throws on missing client",
    run: async () => {
      expectError(
        () =>
          new OpenAIProvider({
            client: undefined as unknown as OpenAIResponsesClient,
          }),
        "OpenAIProvider requires a client.",
      );
    },
  },
  {
    name: "throws on missing request",
    run: async () => {
      const provider = createProvider();
      await expectAsyncError(
        () =>
          provider.generate(
            undefined as unknown as GenerationRequest<unknown>,
          ),
        "OpenAIProvider.generate requires a request.",
      );
    },
  },
  {
    name: "throws on missing prompt",
    run: async () => {
      const provider = createProvider();
      await expectAsyncError(
        () => provider.generate(createRequest({ prompt: " " })),
        "OpenAIProvider.generate requires a prompt.",
      );
    },
  },
  {
    name: "throws on missing schema",
    run: async () => {
      const provider = createProvider();
      await expectAsyncError(
        () =>
          provider.generate({
            ...createRequest(),
            schema: undefined as unknown as StructuredOutputSchema,
          }),
        "OpenAIProvider.generate requires a schema.",
      );
    },
  },
  {
    name: "throws on empty response",
    run: async () => {
      const provider = new OpenAIProvider({ client: new FakeClient({}) });
      await expectAsyncError(
        () => provider.generate(createRequest()),
        "OpenAIProvider received an empty response.",
      );
    },
  },
  {
    name: "throws on invalid JSON",
    run: async () => {
      const provider = new OpenAIProvider({
        client: new FakeClient({ output_text: "not-json" }),
      });
      await expectAsyncError(
        () => provider.generate(createRequest()),
        "OpenAIProvider received invalid JSON output.",
      );
    },
  },
  {
    name: "throws on non-object JSON",
    run: async () => {
      const provider = new OpenAIProvider({
        client: new FakeClient({ output_text: '"text"' }),
      });
      await expectAsyncError(
        () => provider.generate(createRequest()),
        "OpenAIProvider received JSON output that is not an object.",
      );
    },
  },
  {
    name: "wraps client failure with model context",
    run: async () => {
      const provider = new OpenAIProvider({
        client: new FakeClient(new Error("client unavailable")),
      });
      await expectAsyncError(
        () => provider.generate(createRequest({ model: "gpt-contract" })),
        'OpenAI provider request failed for model "gpt-contract": client unavailable',
      );
    },
  },
];

export async function runOpenAIProviderContractChecks(): Promise<OpenAIProviderContractResult> {
  let passed = 0;
  const failures: string[] = [];

  for (const check of checks) {
    try {
      await check.run();
      passed += 1;
    } catch (error) {
      failures.push(`${check.name}: ${errorMessage(error)}`);
    }
  }

  console.log("OpenAI provider contract");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failures.length}`);
  for (const failure of failures) {
    console.log(`* ${failure}`);
  }

  if (failures.length > 0) {
    setFailureExitCode();
  }
  return { passed, failed: failures.length };
}

function createRequest(
  overrides: Partial<GenerationRequest<unknown>> = {},
): GenerationRequest<unknown> {
  return {
    prompt: "Generate contract output.",
    schema: testSchema,
    model: "gpt-4o",
    ...overrides,
  };
}

function createProvider(): OpenAIProvider {
  return new OpenAIProvider({
    client: new FakeClient({ output_text: '{"value":"ok"}' }),
  });
}

function assertEqual(actual: unknown, expected: unknown): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}.`,
    );
  }
}

function assertDeepEqual(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}.`,
    );
  }
}

function expectError(run: () => unknown, expected: string): void {
  try {
    run();
  } catch (error) {
    assertEqual(errorMessage(error), expected);
    return;
  }
  throw new Error(`Expected error: ${expected}`);
}

async function expectAsyncError(
  run: () => Promise<unknown>,
  expected: string,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    assertEqual(errorMessage(error), expected);
    return;
  }
  throw new Error(`Expected error: ${expected}`);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function setFailureExitCode(): void {
  const runtime = globalThis as typeof globalThis & {
    readonly process?: { exitCode?: number };
  };
  if (runtime.process) {
    runtime.process.exitCode = 1;
  }
}

class FakeClient implements OpenAIResponsesClient {
  public lastRequest?: OpenAIResponsesCreateRequest;

  public constructor(
    private readonly result: OpenAIResponsesCreateResponse | Error,
  ) {}

  public readonly responses = {
    create: async (
      request: OpenAIResponsesCreateRequest,
    ): Promise<OpenAIResponsesCreateResponse> => {
      this.lastRequest = request;
      if (this.result instanceof Error) {
        throw this.result;
      }
      return this.result;
    },
  };
}

void runOpenAIProviderContractChecks();
