export interface GenerationProvider {
  generate(
    prompt: string,
    schema: Readonly<Record<string, unknown>>,
    model: string,
  ): Promise<unknown>;
}

export class OpenAIProvider implements GenerationProvider {
  public constructor(private readonly apiKey: string) {}

  public async generate(
    _prompt: string,
    _schema: Readonly<Record<string, unknown>>,
    _model: string,
  ): Promise<unknown> {
    void this.apiKey;
    throw new Error("OpenAIProvider.generate is not implemented");
  }
}
