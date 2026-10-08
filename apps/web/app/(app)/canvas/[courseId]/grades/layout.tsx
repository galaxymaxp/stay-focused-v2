import { GradesWorkspace } from "../../../../../src/features/canvas-grades";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <GradesWorkspace courseId={decodeURIComponent(courseId)}>{children}</GradesWorkspace>;
}
