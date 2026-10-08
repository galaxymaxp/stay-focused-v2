import { Redirect } from "expo-router";

import { GenerationCoreLab } from "../src/features/generation-core/GenerationCoreLab";

export default function GenerationCoreLabRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <GenerationCoreLab />;
}
