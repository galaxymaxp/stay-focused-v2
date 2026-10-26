import { createPlanDeviceStore } from '@stay-focused/shared';
import { sessionStore } from '../../auth/sessionStore';
export const planDeviceStore = createPlanDeviceStore(sessionStore);
