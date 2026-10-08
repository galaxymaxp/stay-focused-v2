import { Suspense } from "react";
import { OwnMaterialScreen } from "../../../../src/features/own-material";
export default function Page() {
  return (
    <Suspense fallback={null}>
      <OwnMaterialScreen />
    </Suspense>
  );
}
