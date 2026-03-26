import { useState } from "react";
import ViewToggle from "./ViewToggle";
import ItemCard from "./ItemCard";
import ItemRow from "./ItemRow";
import type { ItemGalleryProps } from '../interfaces/ItemGalleryInterface';


export default function ItemGallery({ items, title }: ItemGalleryProps) {
  const [isGrid, setIsGrid] = useState(false);

  return (
    <div className="min-h-screen bg-bg font-sans px-4 py-10 sm:px-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text tracking-tight">{title}</h1>
        </div>
        <ViewToggle isGrid={isGrid} onToggle={() => setIsGrid((v) => !v)} />
      </div>

      {/* Contenido */}
      <div className="max-w-full mx-auto">
        {isGrid ? (
          /* Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {items.map((item) => (
              <ItemCard key={item.id} {...item} />
            ))}
          </div>
        ) : (
          /* Lista */
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <ItemRow key={item.id} {...item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
