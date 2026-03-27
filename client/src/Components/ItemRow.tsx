import type { ItemProps } from '../interfaces/ItemInterface';
import { useEffect, useState } from 'react';

export default function ItemRow({ cuantity, image, title, author, tag, price }: ItemProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  return (
    <article className="group relative flex items-center gap-4 bg-bg-secondary rounded-xl border border-border shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-500 ease-in-out p-3 cursor-pointer overflow-hidden">
      {/* Miniatura */}
      <div className="relative shrink-0 w-18 h-18 rounded-xl overflow-hidden bg-babyblue-300">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <img src='/inkoraICO.svg' alt='inkora' className='w-10' />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {tag && (
          <span className="px-2.5 py-1 rounded-full bg-babyblue-400 text-primary-500 text-xs font-semibold tracking-wider uppercase backdrop-blur-sm max-w-32 truncate">
            {tag}
          </span>
        )}
        <h3 className="text-lg font-semibold text-text leading-snug text-start truncate">
          {title}
        </h3>
        <article className='flex flex-row justify-between'>
          <p className="text-sm text-text-muted font-medium tracking-widest uppercase text-start truncate">{author}</p>
        </article>


        <div className="flex items-center justify-between gap-3 min-w-0">

          {price && (
            <p className="text-lg font-bold text-skyblue-500 leading-relaxed text-start shrink-0">{'$' + price}</p>
          )}
          {cuantity <= 10 && (
            <span className="z-10 flex items-center gap-1 rounded-full bg-red-100 text-primary-500 backdrop-blur-sm px-2 py-0.5">
              <svg viewBox="0 0 32 32" className="w-4 h-4 text-red-600 shrink-0">
                <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                <g id="SVGRepo_iconCarrier">
                  <path
                    fill="currentColor"
                    d="M15.5 3c-7.456 0-13.5 6.044-13.5 13.5s6.044 13.5 13.5 13.5 13.5-6.044 13.5-13.5-6.044-13.5-13.5-13.5zM15.5 27c-5.799 0-10.5-4.701-10.5-10.5s4.701-10.5 10.5-10.5 10.5 4.701 10.5 10.5-4.701 10.5-10.5 10.5zM15.5 10c-0.828 0-1.5 0.671-1.5 1.5v5.062c0 0.828 0.672 1.5 1.5 1.5s1.5-0.672 1.5-1.5v-5.062c0-0.829-0.672-1.5-1.5-1.5zM15.5 20c-0.828 0-1.5 0.672-1.5 1.5s0.672 1.5 1.5 1.5 1.5-0.672 1.5-1.5-0.672-1.5-1.5-1.5z"
                  />
                </g>
              </svg>
              <span className="    text-xs text-red-600 font-semibold uppercase overflow-hidden
    transition-all duration-500
    opacity-100 w-auto h-auto
    md:opacity-0 md:w-0 md:h-0 sd:text-[0.65rem]
    md:group-hover:opacity-100 md:group-hover:w-auto md:group-hover:h-auto">
                {cuantity === 1 ? 'ultima unidad' : `ultimas ${cuantity} unidades`}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Flecha */}
      <span className="shrink-0 text-stone-300 group-hover:text-stone-500 group-hover:translate-x-0.5 transition-all duration-200">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      {/* Borde inferior animado */}
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-400 group-hover:w-full transition-all duration-300" />
    </article>
  );
}
