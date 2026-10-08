/** A permanent operation failure, translated to FatalError by Vercel step wrappers. */
export class ProcessingOperationError extends Error {
  public constructor(code: string) {
    super(code);
    this.name = "ProcessingOperationError";
  }
}
