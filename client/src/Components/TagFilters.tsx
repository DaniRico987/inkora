import { Button } from "./Button";

interface TagFiltersProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

export default function TagFilters({ tags, selectedTag, onSelectTag }: TagFiltersProps) {
  const desktopTags = tags.slice(0, 6);

  return (
    <div className="hidden lg:flex items-center gap-2 flex-wrap justify-start w-full">
      <Button
        onClick={() => onSelectTag(null)}
        variant={selectedTag === null ? "tags-active" : "tags"}
        size="auto"
        className={`uppercase transition-colors`}
      >
        Todos
      </Button>
      {desktopTags.map((tag) => (
        <Button
          key={tag}
          onClick={() => onSelectTag(tag)}
          variant={selectedTag === tag ? "tags-active" : "tags"}
          size="auto"
          className={`uppercase transition-colors`}
        >
          {tag}
        </Button>
      ))}
    </div>
  );
}
