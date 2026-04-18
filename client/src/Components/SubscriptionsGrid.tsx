import { useState } from "react";
import type { Category } from "../api/categories";

interface SubscriptionsGridProps {
  categories: Category[];
  subscribedCategoryIds: number[];
  onToggle: (categoryId: number, isSubscribed: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function SubscriptionsGrid({
  categories,
  subscribedCategoryIds,
  onToggle,
  isLoading = false,
}: SubscriptionsGridProps) {
  const [loadingItems, setLoadingItems] = useState<Set<number>>(new Set());

  const handleToggle = async (categoryId: number) => {
    const isCurrentlySubscribed = subscribedCategoryIds.includes(categoryId);
    setLoadingItems((prev) => new Set(prev).add(categoryId));

    try {
      await onToggle(categoryId, !isCurrentlySubscribed);
    } finally {
      setLoadingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(categoryId);
        return newSet;
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {categories.map((category) => {
        const isSubscribed = subscribedCategoryIds.includes(category.categoryId);
        const isItemLoading = loadingItems.has(category.categoryId);

        return (
          <div
            key={category.categoryId}
            className={`
              relative p-4 rounded-lg border-2 transition-all duration-200
              ${
                isSubscribed
                  ? "border-primary-500 bg-blue-100 dark:bg-blue-950"
                  : "border-border bg-bg-card hover:border-primary-300"
              }
              ${isLoading || isItemLoading ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-md"}
            `}
          >
            {/* Checkmark cuando está suscrito */}
            {isSubscribed && (
              <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 bg-primary-500 text-white rounded-full text-xs font-bold">
                ✓
              </div>
            )}

            {/* Content */}
            <div className="flex flex-col items-center gap-3 h-full">
              {/* Category Name */}
              <div className="text-center flex-1 flex items-center justify-center min-h-[40px]">
                <h3
                  className={`text-sm font-semibold transition-colors ${
                    isSubscribed ? "text-text" : "text-text-muted"
                  }`}
                >
                  {category.name}
                </h3>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle(category.categoryId)}
                disabled={isLoading || isItemLoading}
                aria-label={`${isSubscribed ? "Desuscribirse de" : "Suscribirse a"} ${category.name}`}
                className={`
                  relative inline-flex items-center justify-between
                  w-12 h-6 rounded-full
                  border border-border
                  px-0.5
                  transition-all duration-200
                  ${
                    isSubscribed
                      ? "bg-primary-500/20"
                      : "bg-bg hover:bg-border"
                  }
                  ${isLoading || isItemLoading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
                `}
              >
                {/* Thumb deslizante */}
                <span
                  className={`
                    absolute w-5 h-5 rounded-full
                    bg-bg shadow-sm
                    transform transition-transform duration-200
                    ${isSubscribed ? "translate-x-6" : "translate-x-0.5"}
                  `}
                />

                {/* Indicadores visuales pequeños */}
                <span
                  className={`
                    relative z-10 text-xs transition-opacity duration-200
                    ${isSubscribed ? "opacity-100 ml-0.5" : "opacity-40"}
                  `}
                >
                  ✓
                </span>
                <span
                  className={`
                    relative z-10 text-xs transition-opacity duration-200
                    ${isSubscribed ? "opacity-40" : "opacity-100 mr-0.5"}
                  `}
                >
                  ✕
                </span>
              </button>

              {/* Loading Indicator */}
              {isItemLoading && (
                <div className="text-xs text-text-muted">
                  <div className="animate-spin inline-block w-3 h-3 border-2 border-primary-500/30 border-t-primary-500 rounded-full" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
