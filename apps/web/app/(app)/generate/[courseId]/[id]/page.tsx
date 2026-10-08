import { MaterialScreen } from "../../../../../src/features/generate";
export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string; id: string }>;
}) {
  const { courseId, id } = await params;
  return <MaterialScreen courseId={courseId} id={decodeURIComponent(id)} />;
}
