import { QuizScreen } from "../../../../src/features/quiz";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuizScreen id={id} />;
}
