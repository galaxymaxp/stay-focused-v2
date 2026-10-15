import { useEffect } from "react";
import { router } from "expo-router";
import { useQueueItems } from "../../src/features/queue/useQueueItems";
import { POST_SIGN_IN_ROUTE } from "../../src/navigation/appRoutes";
export default function QueueRoute() {
  const { show } = useQueueItems();
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace(POST_SIGN_IN_ROUTE);
    show();
  }, [show]);
  return null;
}
