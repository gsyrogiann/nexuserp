import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createLocalBase44Client } from '@/api/localBase44Client';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const runtimeMode = String(import.meta.env.VITE_APP_RUNTIME || '').toLowerCase();
const useLocalRuntime = runtimeMode === 'local';

export const base44 = useLocalRuntime
  ? createLocalBase44Client()
  : createClient({
      appId,
      token,
      functionsVersion,
      requiresAuth: false,
      appBaseUrl,
    });

if (useLocalRuntime && typeof window !== 'undefined') {
  window['__NEXUS_LOCAL_RUNTIME__'] = base44.__localRuntime;
}
