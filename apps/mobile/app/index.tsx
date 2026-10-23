import { Redirect } from "expo-router";
import { localMeasurements } from '@stay-focused/shared';

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
  // Synchronous route decision only; excludes auth I/O and native rendering.
  const finish = localMeasurements.start('startup.entry_decision');

  if (isRestoring) { finish('empty'); return <RestoringState />; }
  const destination = <Redirect href={session ? POST_SIGN_IN_ROUTE : APP_ROUTES.signIn} />;
  finish('success');
  return destination;
}
