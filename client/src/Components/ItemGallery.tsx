import { useEffect, useMemo, useState } from "react";
import ViewToggle from "./ViewToggle";
import ItemCard from "./ItemCard";
import ItemRow from "./ItemRow";
import TagFilters from "./TagFilters";
import AdvancedFiltersPanel from "./AdvancedFiltersPanel";
import { Button } from "./Button";
import { InputSearch } from "./Inputs";
import type { ItemGalleryProps } from '../interfaces/ItemGalleryInterface';

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function ItemGallery({ items, title }: ItemGalleryProps) {
  const [isGrid, setIsGrid] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [selectedAuthor, setSelectedAuthor] = useState("");
  const [publicationYearFrom, setPublicationYearFrom] = useState("");
  const [publicationYearTo, setPublicationYearTo] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("");

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const updateMedia = () => setIsDesktop(media.matches);
    updateMedia();
    media.addEventListener("change", updateMedia);
    return () => media.removeEventListener("change", updateMedia);
  }, []);

  const availableTags = useMemo(
    () => Array.from(new Set(items.map((item) => item.tag).filter(Boolean))),
    [items]
  );

  const authors = useMemo(
    () => Array.from(new Set(items.map((item) => item.author))).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  const genres = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.genre).filter((genre): genre is string => Boolean(genre)))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [items]
  );

  const statuses = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.status).filter((status): status is string => Boolean(status)))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [items]
  );

  const languages = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.language).filter((language): language is string => Boolean(language)))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [items]
  );

  const normalizedQuery = normalizeText(searchValue);
  const queryTokens = normalizedQuery.length > 0 ? normalizedQuery.split(" ") : [];

  const getLevenshteinDistance = (a: string, b: string): number => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      }
    }
    return matrix[a.length][b.length];
  };

  const matchesTokenWithTolerance = (token: string, words: string[]): boolean => {
    if (token.length <= 2) {
      return words.some((word) => word.startsWith(token));
    }
    const maxDistance = token.length >= 7 ? 2 : 1;
    return words.some((word) => {
      if (word.includes(token)) return true;
      const distance = getLevenshteinDistance(token, word);
      return distance <= maxDistance;
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedTag && item.tag !== selectedTag) return false;
      if (selectedAuthor && item.author !== selectedAuthor) return false;
      const publicationYear = item.publicationYear;
      const fromYear = Number(publicationYearFrom);
      const toYear = Number(publicationYearTo);
      if (publicationYearFrom && (publicationYear === undefined || Number.isNaN(fromYear) || publicationYear < fromYear)) return false;
      if (publicationYearTo && (publicationYear === undefined || Number.isNaN(toYear) || publicationYear > toYear)) return false;
      if (selectedGenre && item.genre !== selectedGenre) return false;
      if (selectedStatus && item.status !== selectedStatus) return false;
      if (selectedLanguage && item.language !== selectedLanguage) return false;

      if (!queryTokens.length) return true;

      const searchableText = normalizeText(`${item.title} ${item.author} ${item.tag}`);
      const searchableWords = searchableText.split(" ").filter(Boolean);

      return queryTokens.every((token) => matchesTokenWithTolerance(token, searchableWords));
    });
  }, [items, selectedTag, selectedAuthor, publicationYearFrom, publicationYearTo, selectedGenre, selectedStatus, selectedLanguage, queryTokens]);

  const clearAdvancedFilters = () => {
    setSelectedAuthor("");
    setPublicationYearFrom("");
    setPublicationYearTo("");
    setSelectedGenre("");
    setSelectedStatus("");
    setSelectedLanguage("");
  };

  return (
    <div className="min-h-screen bg-transparent font-sans px-4 py-10 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-5">
        <AdvancedFiltersPanel
          open={showMoreFilters}
          isDesktop={isDesktop}
          authors={authors}
          genres={genres}
          statuses={statuses}
          languages={languages}
          selectedAuthor={selectedAuthor}
          publicationYearFrom={publicationYearFrom}
          publicationYearTo={publicationYearTo}
          selectedGenre={selectedGenre}
          selectedStatus={selectedStatus}
          selectedLanguage={selectedLanguage}
          onClose={() => setShowMoreFilters(false)}
          onClear={clearAdvancedFilters}
          onAuthorChange={setSelectedAuthor}
          onPublicationYearFromChange={setPublicationYearFrom}
          onPublicationYearToChange={setPublicationYearTo}
          onGenreChange={setSelectedGenre}
          onStatusChange={setSelectedStatus}
          onLanguageChange={setSelectedLanguage}
        />

        <div className="flex-1 min-w-0">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h1 className="text-3xl font-bold text-text tracking-tight">{title}</h1>
              <ViewToggle isGrid={isGrid} onToggle={() => setIsGrid((v) => !v)} />
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="w-full lg:max-w-xl lg:-mb-6">
                <InputSearch
                  value={searchValue}
                  placeholder="Buscar por título, autor o tag"
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </div>
              <Button
                onClick={() => setShowMoreFilters((state) => !state)}
                variant="tags-active"
                size="auto"
              >
                Más filtros
              </Button>
            </div>

            <TagFilters tags={availableTags} selectedTag={selectedTag} onSelectTag={setSelectedTag} />
          </div>

          <div className="max-w-full mx-auto">
            {filteredItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-text-muted">
                No hay resultados para los filtros seleccionados.
              </div>
            ) : isGrid ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredItems.map((item) => (
                  <ItemCard key={item.id} {...item} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredItems.map((item) => (
                  <ItemRow key={item.id} {...item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
