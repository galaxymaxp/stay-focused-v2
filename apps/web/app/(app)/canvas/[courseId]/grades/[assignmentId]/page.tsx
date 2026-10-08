import { GradeAssignmentDetail } from "../../../../../../src/features/canvas-grades";
export default async function Page({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  return <GradeAssignmentDetail assignmentId={decodeURIComponent(assignmentId)} />;
}
