import { LibraryCourseScreen } from "../../../../../src/features/library";
export default async function Page({ params }: { params: Promise<{ courseKey: string }> }) {
  const { courseKey } = await params;
  return <LibraryCourseScreen courseKey={decodeURIComponent(courseKey)} />;
}
