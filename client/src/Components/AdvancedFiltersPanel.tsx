import { Button } from "./Button";
import { InputSelect, InputText } from "./Inputs";

interface AdvancedFiltersPanelProps {
  open: boolean;
  isDesktop: boolean;
  authors: string[];
  genres: string[];
  statuses: string[];
  languages: string[];
  selectedAuthor: string;
  publicationYearFrom: string;
  publicationYearTo: string;
  selectedGenre: string;
  selectedStatus: string;
  selectedLanguage: string;
  onClose: () => void;
  onClear: () => void;
  onAuthorChange: (value: string) => void;
  onPublicationYearFromChange: (value: string) => void;
  onPublicationYearToChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <InputSelect
      label={label}
      value={value}
      options={[{ label: "Todos", value: "" }, ...options.map((option) => ({ label: option, value: option }))]}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default function AdvancedFiltersPanel({
  open,
  isDesktop,
  authors,
  genres,
  statuses,
  languages,
  selectedAuthor,
  publicationYearFrom,
  publicationYearTo,
  selectedGenre,
  selectedStatus,
  selectedLanguage,
  onClose,
  onClear,
  onAuthorChange,
  onPublicationYearFromChange,
  onPublicationYearToChange,
  onGenreChange,
  onStatusChange,
  onLanguageChange,
}: AdvancedFiltersPanelProps) {
  const panelClassName = isDesktop
    ? "w-72 shrink-0 bg-bg-secondary border border-border rounded-2xl p-4 h-fit sticky top-6"
    : "fixed top-16 sm:top-18 left-0 h-[calc(100%-4rem)] sm:h-[calc(100%-4.5rem)] w-[78vw] sm:w-[60vw] md:w-[50vw] max-w-md bg-bg z-50 border-r border-border p-4 overflow-y-auto";

  if (!open) {
    return null;
  }

  return (
    <>
      {!isDesktop && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40"
          aria-label="Cerrar filtros"
          onClick={onClose}
        />
      )}

      <aside className={panelClassName}>
        <div className="flex items-center justify-between mb-4 w-full">
          <h2 className="text-lg font-semibold text-text">Más filtros</h2>
          <Button
            onClick={onClose}
            variant="tags"
            size="auto"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          </Button>
        </div>

        <div className="flex flex-col gap-1">
          <SelectField label="Autor" value={selectedAuthor} options={authors} onChange={onAuthorChange} />
          <div className="grid grid-cols-2 gap-2">
            <InputText
              label="Publicación desde"
              type="number"
              value={publicationYearFrom}
              placeholder="Ej: 1990"
              onChange={(event) => onPublicationYearFromChange(event.target.value)}
            />
            <InputText
              label="Publicación hasta"
              type="number"
              value={publicationYearTo}
              placeholder="Ej: 2020"
              onChange={(event) => onPublicationYearToChange(event.target.value)}
            />
          </div>
          <SelectField label="Género" value={selectedGenre} options={genres} onChange={onGenreChange} />
          <SelectField label="Estado del libro" value={selectedStatus} options={statuses} onChange={onStatusChange} />
          <SelectField label="Idioma" value={selectedLanguage} options={languages} onChange={onLanguageChange} />
        </div>

        <Button
          onClick={onClear}
          variant="secondary"
          size="full"
        >
          Limpiar filtros
        </Button>
      </aside>
    </>
  );
}
