import { Link } from 'react-router-dom';
import { RecommendationsSection } from '../Components/RecommendationsSection';

const shelfBooks = [
  {
    title: 'Noches de misterio',
    meta: 'Misterio y suspenso',
    filter: 'Misterio y suspenso',
    image:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Historias que cuidan',
    meta: 'Novela',
    filter: 'Novela',
    image:
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Ciencia para curiosos',
    meta: 'Ciencia',
    filter: 'Ciencia',
    image:
      'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Arte que inspira',
    meta: 'Arte y diseño',
    filter: 'Arte y diseño',
    image:
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80',
  },
];

const readingMoments = [
  {
    title: 'Lecturas de 20 minutos',
    description:
      'Ideal para pausas cortas con impacto: cuentos, ensayos breves y cronicas memorables.',
  },
  {
    title: 'Fin de semana largo',
    description:
      'Novelas envolventes para desconectar: fantasia, historica, romance y aventura.',
  },
  {
    title: 'Club de lectura',
    description:
      'Selecciones conversables para compartir ideas, subrayados y recomendaciones.',
  },
];

export function ClientHomePage() {
  return (
    <section className="relative w-full overflow-hidden bg-linear-to-b from-bg via-bg to-primary-950/20 px-4 pb-20 pt-4 sm:px-6 lg:px-10">
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(rgba(163,206,241,0.04)_1px,transparent_1px)] bg-size-[18px_18px] opacity-40"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-40 -top-56 z-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(96,150,186,0.28)_0%,rgba(20,37,60,0)_70%)] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-60 -left-48 z-0 h-136 w-136 rounded-full bg-[radial-gradient(circle,rgba(39,76,119,0.25)_0%,rgba(13,24,40,0)_72%)] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <header className="relative mb-2 grid gap-6 overflow-hidden lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 p-4">
          <aside className="relative z-10 flex flex-col justify-center">
            <div>
              <p className="text-[0.85rem] font-black uppercase tracking-[0.22em] text-babyblue-600 mb-3">
                Biblioteca digital
              </p>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.92] text-text mb-6 tracking-tight">
                No busques un
                <br />
                <span className=" bg-linear-to-r text-babyblue-600 bg-clip-text">
                  libro.
                </span>
              </h1>
            </div>
            <p className="max-w-lg text-base sm:text-lg leading-relaxed text-text-muted mb-8 justify-center ml-auto mr-auto">
              Una portada fuerte, una primera página intensa y de pronto ya no
              estás en la misma noche. Inkora está hecha para ese momento.
            </p>

            <div className="flex flex-wrap gap-3 mb-8 justify-center">
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-8 py-4 text-base font-bold text-white transition hover:-translate-y-1 hover:bg-primary-400 active:translate-y-0"
              >
                Quiero descubrir
              </Link>
              <Link
                to="/my-reservations"
                className="inline-flex items-center justify-center rounded-lg border-2 border-babyblue-400 text-babyblue-600 bg-transparent px-7 py-3.5 text-base font-bold dark:text-babyblue-300 transition hover:bg-babyblue-300/10 dark:hover:bg-babyblue-400/20 hover:-translate-y-1"
              >
                Mis reservas
              </Link>
            </div>
          </aside>

          <div className="relative z-10 grid grid-cols-[1.2fr_0.8fr] gap-4 lg:gap-5">
            <div className="group relative overflow-hidden rounded-2xl lg:rounded-3xl shadow-[0_28px_50px_rgba(13,24,40,0.5)] ring-1 ring-white/20 row-span-2">
              <img
                src="https://images.unsplash.com/photo-1463320726281-696a485928c7?auto=format&fit=crop&w=1200&q=80"
                alt="Persona leyendo"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />
            </div>
            <div className="group relative overflow-hidden rounded-2xl shadow-[0_20px_40px_rgba(13,24,40,0.4)] ring-1 ring-white/20 self-end">
              <img
                src="https://images.unsplash.com/photo-1491841651911-c44c30c34548?auto=format&fit=crop&w=900&q=80"
                alt="Libros"
                className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />
            </div>
            <div className="absolute bottom-4 right-4 z-20 rounded-full border-2 border-babyblue-300/50 bg-primary-900/90 px-5 py-2 text-[0.7rem] font-black uppercase tracking-[0.16em] text-babyblue-100 backdrop-blur-sm transform -rotate-3 shadow-lg">
              Selección 2026
            </div>
          </div>
        </header>

        <RecommendationsSection />

        <section className="mt-16 lg:mt-20">
          <div className="mb-10">
            <p className="text-[0.85rem] font-black uppercase tracking-[0.22em] text-babyblue-600 mb-3">
              Estantería viva
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-text">
              Portadas que llaman
              <br />
              desde lejos
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shelfBooks.map((book) => (
              <Link
                key={book.title}
                to={`/catalog?genre=${encodeURIComponent(book.filter)}`}
                aria-label={`Abrir catálogo filtrado por ${book.filter}`}
                className="group block rounded-2xl outline-none transition duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-babyblue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <div className="relative overflow-hidden rounded-2xl shadow-[0_16px_40px_rgba(13,24,40,0.4)] ring-1 ring-white/15 mb-4 aspect-video">
                  <img
                    src={book.image}
                    alt={book.title}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                    <span className="rounded-full border border-white/20 bg-primary-900/85 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.16em] text-babyblue-50 backdrop-blur-sm transition group-hover:border-babyblue-200/70 group-hover:bg-primary-800">
                      Abrir catálogo →
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-black text-text group-hover:scale-150 group-hover:translate-y-2 transition duration-500">
                    {book.title}
                  </h3>
                  <p className="text-xs uppercase tracking-[0.16em] text-babyblue-600 font-bold mt-1 group-hover:hidden transition duration-500">
                    {book.meta}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-white/10 pt-12 lg:pt-14">
          <div className="mb-14">
            <p className="text-[0.85rem] font-black uppercase tracking-[0.22em] text-babyblue-600 mb-3">
              No todos leen igual
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-text">
              Escoge tu ritmo y<br />
              deja que Inkora proponga
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {readingMoments.map((moment, index) => (
              <article
                key={moment.title}
                className="group relative rounded-2xl bg-linear-to-br from-primary-800/40 to-primary-900/60 border border-babyblue-300/30 p-8 backdrop-blur-sm hover:border-babyblue-300/60 hover:shadow-[0_16px_40px_rgba(39,76,119,0.3)] transition duration-500"
              >
                <div className="absolute top-6 right-6 text-6xl font-black text-babyblue-300/20 group-hover:text-babyblue-200/30 transition">
                  0{index + 1}
                </div>
                <h3 className="text-2xl font-black text-text mb-4 relative z-10">
                  {moment.title}
                </h3>
                <p className="text-base leading-relaxed text-babyblue-100/80 relative z-10">
                  {moment.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 lg:mt-20 relative">
          <div className="rounded-3xl bg-linear-to-r from-primary-700/90 via-primary-600/80 to-skyblue-700/90 border border-babyblue-300/40 shadow-[0_32px_60px_rgba(39,76,119,0.4)] overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,206,241,0.15)_0%,transparent_50%)] pointer-events-none" />
            <div className="relative z-10 px-8 sm:px-12 py-12 lg:py-16 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="max-w-2xl">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-babyblue-200/80 mb-4">
                  Tu siguiente lectura
                </p>
                <h2 className="text-4xl sm:text-5xl lg:text-5xl font-black text-white leading-tight mb-2">
                  Entra al catálogo
                </h2>
                <p className="text-babyblue-100/90 text-lg">
                  y encuentra el libro que no sabías que necesitabas.
                </p>
              </div>
              <div className="flex flex-wrap gap-4 lg:flex-col">
                <Link
                  to="/catalog"
                  className="inline-flex items-center justify-center rounded-lg bg-white text-primary-700 px-8 py-4 text-base font-bold shadow-[0_12px_30px_rgba(255,255,255,0.2)] transition hover:shadow-[0_16px_40px_rgba(255,255,255,0.3)] hover:-translate-y-1 active:translate-y-0"
                >
                  Abrir catálogo
                </Link>
                <Link
                  to="/news"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-white/60 bg-white/10 text-white px-8 py-3.5 text-base font-bold transition hover:bg-white/20 hover:border-white hover:-translate-y-1"
                >
                  Recomendaciones
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
