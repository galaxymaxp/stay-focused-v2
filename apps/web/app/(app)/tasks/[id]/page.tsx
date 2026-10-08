import { TaskDetailScreen } from "../../../../src/features/tasks";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TaskDetailScreen id={decodeURIComponent(id)} />;
}
