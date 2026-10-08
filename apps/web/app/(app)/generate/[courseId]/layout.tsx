import { CourseWorkspace } from "../../../../src/features/generate";
export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ courseId: string }>;
  children: React.ReactNode;
}) {
  const { courseId } = await params;
  return <CourseWorkspace courseId={courseId}>{children}</CourseWorkspace>;
}
