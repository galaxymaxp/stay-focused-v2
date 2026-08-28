import { router } from "expo-router";

import { StudyLibraryScreen } from "../../../src/features/library/StudyLibraryScreen";
import { APP_ROUTES } from "../../../src/navigation/appRoutes";

export default function LibraryRoute() {
  return (
    <StudyLibraryScreen onCreateReviewer={() => router.push(APP_ROUTES.generate)} />
  );
}
