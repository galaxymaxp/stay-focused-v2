import { GenerationScreen } from "../../../../src/features/queue";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GenerationScreen id={id} />;
}
