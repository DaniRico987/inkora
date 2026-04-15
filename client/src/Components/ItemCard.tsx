import type { ItemProps } from '../interfaces/ItemInterface';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';


export default function ItemCard({ id, cuantity, image, title, author, tag, price }: ItemProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  return (
    <Link to={`/books/${id}`}>
      <article className="group flex flex-col bg-bg-secondary rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ease-in-out cursor-pointer">
      {/* Imagen */}
      <div className="relative h-44 overflow-hidden bg-babyblue-300">
        {cuantity <= 10 && (
          <span
            className="
    absolute z-10 flex items-center gap-1
    top-3 left-3 rounded-full
    bg-red-100 text-primary-500 backdrop-blur-sm
    px-2.5 py-1
  "
          >
            <svg viewBox="0 0 32 32" className="w-5 h-5 text-red-600 shrink-0">
              <g id="SVGRepo_bgCarrier" strokeWidth="0" />
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
              <g id="SVGRepo_iconCarrier">
                <path
                  fill="currentColor"
                  d="M15.5 3c-7.456 0-13.5 6.044-13.5 13.5s6.044 13.5 13.5 13.5 13.5-6.044 13.5-13.5-6.044-13.5-13.5-13.5zM15.5 27c-5.799 0-10.5-4.701-10.5-10.5s4.701-10.5 10.5-10.5 10.5 4.701 10.5 10.5-4.701 10.5-10.5 10.5zM15.5 10c-0.828 0-1.5 0.671-1.5 1.5v5.062c0 0.828 0.672 1.5 1.5 1.5s1.5-0.672 1.5-1.5v-5.062c0-0.829-0.672-1.5-1.5-1.5zM15.5 20c-0.828 0-1.5 0.672-1.5 1.5s0.672 1.5 1.5 1.5 1.5-0.672 1.5-1.5-0.672-1.5-1.5-1.5z" />
              </g>
            </svg>
            <span
              className="
    text-xs text-red-600 font-semibold uppercase overflow-hidden
    transition-all duration-500

    /* MOBILE: siempre visible */
    opacity-100 w-auto h-auto

    /* DESKTOP: oculto por defecto */
    md:opacity-0 md:w-0 md:h-0

    /* DESKTOP HOVER: visible */
    md:group-hover:opacity-100 md:group-hover:w-auto md:group-hover:h-auto
  "
            >
              {cuantity === 1
                ? 'última unidad'
                : `últimas ${cuantity} unidades`}
            </span>
          </span>
        )}
        {image && !imageFailed ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <img src='/inkoraICO.svg' alt='inkora' className='w-20' />
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex flex-col gap-2 p-5 flex-1 justify-start">
        <h3 className="text-lg font-semibold text-text leading-snug transition-colors text-start">
          {title}
        </h3>
        <p className="text-sm text-text-muted font-medium tracking-widest uppercase text-start">{author}</p>
        {/* Tag */}
        {tag && (
          <span className="px-2.5 py-1 rounded-full bg-babyblue-400 text-primary-500 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm min-w-20 max-w-30">
            {tag}
          </span>
        )}
        {price && (
          <p className="text-lg font-bold text-skyblue-500 leading-relaxed line-clamp-2 mt-0.5 text-start">{'$' + price}</p>
        )}
      </div>

      {/* Borde inferior animado */}
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-400 group-hover:w-full transition-all duration-300" />
      </article>
    </Link>
  );
}
