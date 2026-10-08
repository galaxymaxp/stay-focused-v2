import { ArtifactScreen } from "../../../../src/features/library";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ArtifactScreen id={decodeURIComponent(id)} />;
}
