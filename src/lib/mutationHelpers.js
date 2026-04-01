import { toast } from '@/components/ui/use-toast';
import { reportAuditEvent, reportError, reportOperationalEvent } from '@/lib/observability';

export function getErrorMessage(error, fallback = 'Η ενέργεια απέτυχε.') {
  if (!error) {
    return fallback;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  if (typeof error.error === 'string' && error.error.trim()) {
    return error.error;
  }

  return fallback;
}

export function showErrorToast(title, error, fallback) {
  toast({
    variant: 'destructive',
    title,
    description: getErrorMessage(error, fallback),
  });
}

export function validateRequiredFields(data, fields) {
  for (const [key, label] of Object.entries(fields)) {
    const value = data?.[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error(`Το πεδίο "${label}" είναι υποχρεωτικό.`);
    }
  }
}

/**
 * @template T
 * @param {() => Promise<T>} operation
 * @param {{
 *   actionLabel?: string,
 *   fallbackMessage?: string,
 *   validate?: () => void,
 *   audit?: {
 *     action: string,
 *     target: string,
 *     targetId?: string,
 *     summary?: string,
 *     metadata?: Record<string, any>,
 *   }
 * }} [options]
 * @returns {Promise<T>}
 */
export async function executeMutation(operation, { actionLabel, fallbackMessage, validate, audit } = {}) {
  try {
    if (typeof validate === 'function') {
      validate();
    }

    const result = await operation();
    if (actionLabel) {
      reportOperationalEvent('execute_mutation_success', { actionLabel });
    }
    if (audit?.action && audit?.target) {
      reportAuditEvent({
        ...audit,
        status: 'success',
        targetId: audit.targetId || result?.id,
      });
    }
    return result;
  } catch (error) {
    if (audit?.action && audit?.target) {
      reportAuditEvent({
        ...audit,
        status: 'failed',
        metadata: {
          ...audit.metadata,
          error: getErrorMessage(error, fallbackMessage || `Αποτυχία στο ${actionLabel || 'mutation'}.`),
        },
      });
    }
    reportError(error, {
      source: 'executeMutation',
      actionLabel,
    });
    throw new Error(getErrorMessage(error, fallbackMessage || `Αποτυχία στο ${actionLabel || 'mutation'}.`));
  }
}
