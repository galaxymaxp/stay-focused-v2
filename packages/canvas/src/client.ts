export interface CanvasClientOptions {
  baseUrl: string;
  personalAccessToken: string;
}

export class CanvasClient {
  public readonly baseUrl: string;
  private readonly personalAccessToken: string;

  public constructor({ baseUrl, personalAccessToken }: CanvasClientOptions) {
    this.baseUrl = baseUrl;
    this.personalAccessToken = personalAccessToken;
  }

  public get isConfigured(): boolean {
    return this.baseUrl.length > 0 && this.personalAccessToken.length > 0;
  }
}
