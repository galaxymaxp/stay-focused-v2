import { CourseScreen } from "../../../../src/features/generate";
export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseScreen id={courseId} />;
}
