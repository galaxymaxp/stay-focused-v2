import { Redirect, Stack } from "expo-router";

import { RestoringState } from "../../src/app-shell/RestoringState";
import { useAuth } from "../../src/auth";
import { POST_SIGN_IN_ROUTE } from "../../src/navigation/appRoutes";

export default function AuthLayout() {
  const { isRestoring, session } = useAuth();

  if (isRestoring) return <RestoringState />;
  // A restored session must not be able to sit on the sign-in screen.
  if (session) return <Redirect href={POST_SIGN_IN_ROUTE} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
