/** A replaceable preview: invalidate at input time, rather than response time. */
export function createQuietPreview<Request, Result>(callbacks: {
  load(request: Request): Promise<Result>;
  start(): void;
  result(result: Result, request: Request): void;
  error(error: unknown): void;
  idle(): void;
}, quietMs = 400) {
  let revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const invalidate = () => { revision += 1; clearTimeout(timer); timer = undefined; };
  return {
    invalidate,
    queue(request: Request) {
      invalidate();
      const current = revision;
      timer = setTimeout(async () => {
        timer = undefined;
        callbacks.start();
        try {
          const result = await callbacks.load(request);
          if (revision === current) callbacks.result(result, request);
        } catch (error) {
          if (revision === current) callbacks.error(error);
        } finally {
          if (revision === current) callbacks.idle();
        }
      }, quietMs);
    },
  };
}
