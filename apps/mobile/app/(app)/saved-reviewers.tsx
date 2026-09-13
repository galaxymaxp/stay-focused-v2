import { router } from "expo-router";
import { StudyLibraryScreen } from "../../src/features/library/StudyLibraryScreen";
export default function SavedReviewers() { return <StudyLibraryScreen onCreateReviewer={() => router.navigate("/courses")} />; }
