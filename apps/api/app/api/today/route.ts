import { experienceJson, experienceOptions, experienceReadRoute, readInteger } from '@/lib/experience/read-http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request): Promise<Response> {
  return experienceReadRoute(request, async (service, userId) => {
    const query = new URL(request.url).searchParams;
    const offset = readInteger(query.get('utcOffsetMinutes'), 0, -720, 840);
    const date = query.get('date') ?? new Date(Date.now() + offset * 60_000).toISOString().slice(0, 10);
    return experienceJson(await service.getTodayScreen(userId, date, offset, {
      ...(query.has('startsAt') ? { startsAt: query.get('startsAt')! } : {}),
      ...(query.has('endsAt') ? { endsAt: query.get('endsAt')! } : {}),
    }));
  });
}
export const OPTIONS = experienceOptions;
