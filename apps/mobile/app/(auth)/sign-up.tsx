import { router } from "expo-router";

import { SignUpScreen } from "../../src/features/auth/SignUpScreen";
import { APP_ROUTES } from "../../src/navigation/appRoutes";

export default function SignUpRoute() {
  return (
    <SignUpScreen
      onSignInInstead={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace(APP_ROUTES.signIn);
      }}
    />
  );
}
