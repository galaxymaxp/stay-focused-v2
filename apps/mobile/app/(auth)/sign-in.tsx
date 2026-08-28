import { router } from "expo-router";

import { SignInScreen } from "../../src/features/auth/SignInScreen";
import { APP_ROUTES } from "../../src/navigation/appRoutes";

export default function SignInRoute() {
  return <SignInScreen onCreateAccount={() => router.push(APP_ROUTES.signUp)} />;
}
