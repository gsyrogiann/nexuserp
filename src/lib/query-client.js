import { MutationCache, QueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '@/lib/mutationHelpers';
import { toast } from '@/components/ui/use-toast';


export const queryClientInstance = new QueryClient({
	mutationCache: new MutationCache({
		onError: (error, _variables, _context, mutation) => {
			const description = getErrorMessage(error, mutation.meta?.fallbackMessage || 'Η ενέργεια απέτυχε.');
			console.error('Mutation error:', error);
			toast({
				variant: 'destructive',
				title: mutation.meta?.title || 'Αποτυχία αποθήκευσης',
				description,
			});
		},
	}),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});
