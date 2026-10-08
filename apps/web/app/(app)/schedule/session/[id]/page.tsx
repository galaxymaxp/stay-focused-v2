import { Suspense } from "react";
import { StudySessionScreen } from "../../../../../src/features/study-session";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <StudySessionScreen id={decodeURIComponent(id)} />
    </Suspense>
  );
}
