import { appParams } from '@/lib/app-params';

const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const getBrowserOrigin = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return trimTrailingSlash(window.location.origin);
};

const getFunctionsBaseUrl = () => {
  const explicitBase = trimTrailingSlash(import.meta.env.VITE_BASE44_FUNCTIONS_BASE_URL || '');
  if (explicitBase) {
    return explicitBase;
  }

  const appBaseUrl = trimTrailingSlash(appParams.appBaseUrl || '');
  if (appBaseUrl.includes('app.base44.com')) {
    return appBaseUrl.replace('app.base44.com', 'functions.base44.com');
  }

  const browserOrigin = getBrowserOrigin();
  if (browserOrigin.includes('app.base44.com')) {
    return browserOrigin.replace('app.base44.com', 'functions.base44.com');
  }

  return browserOrigin;
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
  telegramWebhookUrl: buildFunctionUrl('telegramAI'),
  voipWebhookUrl: buildFunctionUrl('voipWebhook'),
};
