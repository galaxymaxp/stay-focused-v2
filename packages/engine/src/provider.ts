export interface GenerationRequest<TOutput> {
  readonly prompt: string;
  readonly schema: Readonly<Record<string, unknown>>;
  readonly model: string;
  readonly temperature?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GenerationProvider {
  generate<TOutput>(request: GenerationRequest<TOutput>): Promise<TOutput>;
}

export class OpenAIProvider implements GenerationProvider {
  public constructor(private readonly apiKey: string) {}

  public async generate<TOutput>(
    _request: GenerationRequest<TOutput>,
  ): Promise<TOutput> {
    void this.apiKey;
    throw new Error("OpenAIProvider is not implemented yet.");
  }
}
