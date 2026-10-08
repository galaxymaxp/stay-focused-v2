import { AnnouncementDetail } from "../../../../src/features/announcements";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnnouncementDetail id={decodeURIComponent(id)} />;
}
