import { describe, expect, it, vi } from 'vitest';
const backfill = vi.hoisted(() => vi.fn().mockResolvedValue({ admitted: 0 }));
vi.mock('./backfill', () => ({ processPreparationBackfill: backfill, BACKFILL_POLL_RESERVE_MS: 30_000 }));
import { processCanvasMetadataPolls } from '@/lib/notifications/canvas-poll';
import type { PreparationClient } from './repository';

describe('backfill poll entrypoint', () => {
  it('runs independently even when no notification course is due or claimable', async () => {
    const client = { rpc: vi.fn().mockResolvedValue({ data: [], error: null }) } as unknown as PreparationClient;
    const deadline = Date.now() + 100_000;
    expect(await processCanvasMetadataPolls(client, 'poll', deadline)).toEqual({ courses: 0, failed: 0 });
    expect(backfill).toHaveBeenCalledWith(client, 'poll', deadline);
  });
});
