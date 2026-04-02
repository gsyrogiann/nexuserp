import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/mutationHelpers';
import { toast } from '@/components/ui/use-toast';
import { reportError, reportOperationalEvent } from '@/lib/observability';


export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			reportError(error, {
				source: 'react-query.query',
				queryKey: query.queryKey,
			});
		},
	}),
	mutationCache: new MutationCache({
		onError: (error, variables, _context, mutation) => {
			const description = getErrorMessage(error, mutation.meta?.fallbackMessage || 'Η ενέργεια απέτυχε.');
			reportError(error, {
				source: 'react-query.mutation',
				mutationKey: mutation.options?.mutationKey,
				variables,
			});
			toast({
				variant: 'destructive',
				title: mutation.meta?.title || 'Αποτυχία αποθήκευσης',
				description,
			});
		},
		onSuccess: (_data, variables, _context, mutation) => {
			if (mutation.meta?.actionLabel) {
				reportOperationalEvent('mutation_success', {
					actionLabel: mutation.meta.actionLabel,
					mutationKey: mutation.options?.mutationKey,
					variables,
				});
			}
		},
	}),
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: (failureCount, error) => {
				const status = error?.response?.status;
				if (status === 401 || status === 403) {
					return false;
				}

				return failureCount < 1;
			},
		},
	},
});
