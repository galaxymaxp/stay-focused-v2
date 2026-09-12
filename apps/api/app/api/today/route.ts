import { experienceJson, experienceOptions, experienceRoute, readInteger } from '@/lib/experience/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request): Promise<Response> {
  return experienceRoute(request, async (service, userId) => {
    const query = new URL(request.url).searchParams;
    const offset = readInteger(query.get('utcOffsetMinutes'), 0, -720, 840);
    const date = query.get('date') ?? new Date(Date.now() + offset * 60_000).toISOString().slice(0, 10);
    return experienceJson(await service.getTodayOverview(userId, date, offset));
  });
}
export const OPTIONS = experienceOptions;
