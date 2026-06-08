const RECOMMENDATIONS_CHANGED_EVENT = 'inkora:recommendations-changed';

export function notifyRecommendationsChanged(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(RECOMMENDATIONS_CHANGED_EVENT));
}

export function subscribeToRecommendationsChanged(
  handler: () => void,
): () => void {
  window.addEventListener(RECOMMENDATIONS_CHANGED_EVENT, handler);
  return () =>
    window.removeEventListener(RECOMMENDATIONS_CHANGED_EVENT, handler);
}
