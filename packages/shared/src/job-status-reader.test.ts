import { expect, it, vi } from "vitest";
import { createJobStatusReader } from "./job-status-reader";
import type { ProcessingJobListPage } from "./index";

const page: ProcessingJobListPage = { jobs: [], nextCursor: null };
it("deduplicates concurrent reads and serializes a changed detail target", async () => {
  let finish!: (value: ProcessingJobListPage) => void;
  const load = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<ProcessingJobListPage>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(page);
  const reader = createJobStatusReader(load);
  const first = reader.read("a");
  expect(reader.read("a")).toBe(first);
  const second = reader.read("b");
  const duplicate = reader.read("b");
  await Promise.resolve();
  expect(load).toHaveBeenCalledTimes(1);
  finish(page);
  await Promise.all([first, second, duplicate]);
  expect(load.mock.calls.map((call) => call[0])).toEqual(["a", "b"]);
});
it("aborts the old owner transport and cannot restart after disposal", async () => {
  const load = vi.fn().mockResolvedValue(page);
  const reader = createJobStatusReader(load);
  await reader.read();
  reader.dispose();
  expect(load.mock.calls[0]![1].aborted).toBe(true);
  await expect(reader.read()).rejects.toThrow("job_reader_disposed");
  expect(load).toHaveBeenCalledTimes(1);
});
