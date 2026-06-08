import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToRecommendationsChanged } from '../utils/recommendationsEvents';

export function useRecommendationRefreshListener(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    return subscribeToRecommendationsChanged(() => {
      void queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    });
  }, [queryClient]);
}
