import type { FooterProps } from '../interfaces/FooterInterface';

export function Footer({
  brandName,
  description = 'Plataforma de lectura y gestion de catalogo.',
  sections = [],
  bottomText,
  className = '',
}: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={[
        'w-full rounded-2xl border border-border bg-bg-secondary/95',
        'px-4 py-6 sm:px-6 sm:py-8',
        className,
      ].join(' ')}
    >
      <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4">
        <div className="md:col-span-2 lg:col-span-1">
          <h3 className="text-base sm:text-lg font-semibold text-text">{brandName}</h3>
          <p className="mt-2 text-sm text-text-muted leading-6 wrap-break-word">
            {description}
          </p>
        </div>

        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">
              {section.title}
            </h4>
            <ul className="mt-3 space-y-2">
              {section.links.map((link) => (
                <li key={`${section.title}-${link.label}`}>
                  <a
                    href={link.href}
                    className="text-sm text-text hover:text-primary-600 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-border pt-4 sm:mt-8 sm:pt-5">
        <p className="text-xs sm:text-sm text-text-muted wrap-break-word">
          {bottomText ?? `${year} ${brandName}. Todos los derechos reservados.`}
        </p>
      </div>
    </footer>
  );
}
