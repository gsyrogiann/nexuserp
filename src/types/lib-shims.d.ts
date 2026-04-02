declare module '@/lib/mutationHelpers' {
  export function getErrorMessage(error: any, fallback?: string): string;
  export function showErrorToast(title: string, error: any, fallback?: string): void;
  export function validateRequiredFields(
    data: Record<string, any>,
    fields: Record<string, string>
  ): void;
  export function executeMutation<T>(
    operation: () => Promise<T>,
    options?: {
      actionLabel?: string;
      fallbackMessage?: string;
      validate?: () => void;
    }
  ): Promise<T>;
}
