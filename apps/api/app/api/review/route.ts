import { runPipeline } from "@stay-focused/engine";
import type { SourceNormalizationInput } from "@stay-focused/engine";
import { NextResponse } from "next/server";
import { createServerOpenAIProvider } from "../../../src/providers/openai-provider";

export async function POST(request: Request): Promise<NextResponse> {
  // TODO: verify JWT token

  if (process.env.RUN_OPENAI_SMOKE !== "1") {
    return NextResponse.json(
      { error: "Real provider not yet enabled." },
      { status: 501 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isSourceNormalizationInput(body)) {
    return NextResponse.json(
      { error: "Request body must include text or blocks." },
      { status: 400 },
    );
  }

  const input = body as SourceNormalizationInput;
  if (!input.text && (!input.blocks || input.blocks.length === 0)) {
    return NextResponse.json(
      { error: "Request body must include text or blocks." },
      { status: 400 },
    );
  }

  let provider;
  try {
    provider = createServerOpenAIProvider();
  } catch {
    return NextResponse.json(
      { error: "Provider configuration error." },
      { status: 500 },
    );
  }

  try {
    const output = await runPipeline({ input, provider });
    return NextResponse.json(output);
  } catch {
    return NextResponse.json(
      { error: "Pipeline failed." },
      { status: 500 },
    );
  }
}

function isSourceNormalizationInput(value: unknown): value is SourceNormalizationInput {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
