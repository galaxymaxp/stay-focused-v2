import type { GenerationRequest, StructuredOutputSchema } from "@stay-focused/engine";

import { createServerOpenAIProvider } from "./openai-provider.js";

const smokeSchema: StructuredOutputSchema = {
  name: "OpenAIProviderSmokeOutput",
  description: "Minimal structured output for the opt-in provider smoke test.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["ok"],
    properties: {
      ok: { type: "boolean" },
    },
  },
};

export async function runOpenAIProviderSmoke(): Promise<void> {
  if (process.env.RUN_OPENAI_SMOKE !== "1") {
    throw new Error(
      "OpenAI smoke test is disabled. Set RUN_OPENAI_SMOKE=1 to enable it.",
    );
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is required for the OpenAI smoke test.");
  }

  const provider = createServerOpenAIProvider({ defaultModel: "gpt-4o" });
  const request: GenerationRequest<{ readonly ok: boolean }> = {
    prompt: "Return JSON with ok set to true.",
    schema: smokeSchema,
    model: "gpt-4o",
    temperature: 0,
  };

  await provider.generate(request);
  console.log("OpenAI provider smoke test passed.");
}

if (require.main === module) {
  void runOpenAIProviderSmoke().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
