import { Redirect } from "expo-router";

import { useAuth } from "../src/auth";
import { RestoringState } from "../src/app-shell/RestoringState";
import { APP_ROUTES, POST_SIGN_IN_ROUTE } from "../src/navigation/appRoutes";

/**
 * Entry route. Session restoration must finish before a destination can be
 * chosen, otherwise a cold start would briefly redirect a signed-in user to
 * sign-in.
 */
export default function IndexRoute() {
  const { isRestoring, session } = useAuth();

  if (isRestoring) return <RestoringState />;
  return <Redirect href={session ? POST_SIGN_IN_ROUTE : APP_ROUTES.signIn} />;
}
