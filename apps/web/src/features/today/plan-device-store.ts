import { createPlanDeviceStore } from '@stay-focused/shared';
import { readLocalPreference, writeLocalPreference } from '../../lib/local-preference';
export const planDeviceStore = createPlanDeviceStore({ getItem: readLocalPreference, setItem: writeLocalPreference });
