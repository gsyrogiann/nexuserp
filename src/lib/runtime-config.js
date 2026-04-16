import { appParams } from '@/lib/app-params';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const trimFunctionsSuffix = (value = '') => value.replace(/\/functions\/[^/]+$/, '/functions');

const getBrowserOrigin = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return trimTrailingSlash(window.location.origin);
};

const isBase44PreviewShell = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.hostname === 'app.base44.com';
};

const getFunctionsRoot = (value = '') => {
  const trimmed = trimTrailingSlash(value);
  if (!trimmed) {
    return '';
  }

  if (trimmed.endsWith('/functions')) {
    return trimmed;
  }

  if (trimmed.includes('/functions/')) {
    return trimFunctionsSuffix(trimmed);
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.startsWith('functions.')) {
      return trimmed;
    }
  } catch {
    // Fall through to best-effort path handling.
  }

  return `${trimmed}/functions`;
};

const getFunctionsBaseUrl = () => {
  const explicitBase = getFunctionsRoot(import.meta.env.VITE_BASE44_FUNCTIONS_BASE_URL || '');
  if (explicitBase) {
    return explicitBase;
  }

  const appBaseUrl = trimTrailingSlash(appParams.appBaseUrl || '');
  if (appBaseUrl) {
    return getFunctionsRoot(appBaseUrl);
  }

  const browserOrigin = getBrowserOrigin();
  if (browserOrigin) {
    return getFunctionsRoot(browserOrigin);
  }

  return '';
};

const buildFunctionUrl = (name) => {
  const baseUrl = getFunctionsBaseUrl();
  if (!baseUrl) {
    return '';
  }

  return `${baseUrl}/${name}`;
};

export const runtimeConfig = {
  appBaseUrl: trimTrailingSlash(appParams.appBaseUrl || getBrowserOrigin()),
  functionsBaseUrl: getFunctionsBaseUrl(),
  serverApiUrl: trimTrailingSlash(import.meta.env.VITE_SERVER_API_URL || 'http://127.0.0.1:4000/api'),
  appEnvironment: import.meta.env.VITE_APP_ENVIRONMENT || import.meta.env.MODE || 'development',
  appRelease: import.meta.env.VITE_APP_RELEASE || '',
  appRuntime: import.meta.env.VITE_APP_RUNTIME || 'cloud',
  isLocalRuntime: String(import.meta.env.VITE_APP_RUNTIME || '').toLowerCase() === 'local',
  isServerRuntime: String(import.meta.env.VITE_APP_RUNTIME || '').toLowerCase() === 'server',
  isBase44PreviewShell: isBase44PreviewShell(),
  observabilityEndpoint: trimTrailingSlash(import.meta.env.VITE_OBSERVABILITY_ENDPOINT || buildFunctionUrl('observabilityIngest')),
  telegramWebhookUrl: buildFunctionUrl('telegramAI'),
  voipWebhookUrl: buildFunctionUrl('voipWebhook'),
  observabilityIngestUrl: buildFunctionUrl('observabilityIngest'),
};
