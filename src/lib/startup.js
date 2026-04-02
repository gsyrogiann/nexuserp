export const STARTUP_TIMEOUT_MS = 8000;
export const STARTUP_RETRY_DELAY_MS = 600;
export const STARTUP_SLOW_UI_MS = 3500;
export const REQUEST_TIMEOUT_MS = 12000;

export class StartupTimeoutError extends Error {
  constructor(label, timeoutMs) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = 'StartupTimeoutError';
    this.code = 'startup_timeout';
    this.label = label;
    this.timeoutMs = timeoutMs;
  }
}

export function isStartupTimeoutError(error) {
  return error instanceof StartupTimeoutError || error?.code === 'startup_timeout';
}

export function isRetryableStartupError(error) {
  if (isStartupTimeoutError(error)) {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('load failed')
  );
}

export async function wait(delayMs) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function withTimeout(promiseOrFactory, { timeoutMs = STARTUP_TIMEOUT_MS, label = 'startup_request' } = {}) {
  let timeoutId;
  const task = typeof promiseOrFactory === 'function' ? promiseOrFactory() : promiseOrFactory;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new StartupTimeoutError(label, timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([task, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function retryAsync(factory, {
  attempts = 2,
  delayMs = STARTUP_RETRY_DELAY_MS,
  shouldRetry = isRetryableStartupError,
} = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await factory(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !shouldRetry(error)) {
        throw error;
      }

      await wait(delayMs);
    }
  }

  throw lastError;
}
