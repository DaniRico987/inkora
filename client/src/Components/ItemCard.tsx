import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ItemProps } from '../interfaces/ItemInterface';

export default function ItemCard({ id, cuantity, image, title, author, tag, price }: ItemProps) {
    const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
    const showImage = Boolean(image && failedImageSrc !== image);

    return (
        <Link to={`/books/${id}`}>
            <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-secondary shadow-sm transition-all duration-500 ease-in-out hover:-translate-y-1 hover:shadow-xl cursor-pointer">
                <div className="relative h-44 overflow-hidden bg-babyblue-300">
                    {cuantity <= 10 && (
                        <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-primary-500 backdrop-blur-sm">
                            <svg viewBox="0 0 32 32" className="h-5 w-5 shrink-0 text-red-600">
                                <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                                <g id="SVGRepo_iconCarrier">
                                    <path
                                        fill="currentColor"
                                        d="M15.5 3c-7.456 0-13.5 6.044-13.5 13.5s6.044 13.5 13.5 13.5 13.5-6.044 13.5-13.5-6.044-13.5-13.5-13.5zM15.5 27c-5.799 0-10.5-4.701-10.5-10.5s4.701-10.5 10.5-10.5 10.5 4.701 10.5 10.5-4.701 10.5-10.5 10.5zM15.5 10c-0.828 0-1.5 0.671-1.5 1.5v5.062c0 0.828 0.672 1.5 1.5 1.5s1.5-0.672 1.5-1.5v-5.062c0-0.829-0.672-1.5-1.5-1.5zM15.5 20c-0.828 0-1.5 0.672-1.5 1.5s0.672 1.5 1.5 1.5 1.5-0.672 1.5-1.5-0.672-1.5-1.5-1.5z"
                                    />
                                </g>
                            </svg>
                            <span className="text-xs font-semibold uppercase text-red-600 transition-all duration-500 opacity-100 w-auto h-auto md:opacity-0 md:w-0 md:h-0 md:group-hover:opacity-100 md:group-hover:w-auto md:group-hover:h-auto">
                                {cuantity === 1 ? 'última unidad' : `últimas ${cuantity} unidades`}
                            </span>
                        </span>
                    )}

                    {showImage ? (
                        <img
                            src={image ?? undefined}
                            alt={title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={() => setFailedImageSrc(image ?? null)}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-text-muted">
                            <img src="/inkoraICO.svg" alt="inkora" className="w-20" />
                        </div>
                    )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-5">
                    <h3 className="text-start text-lg font-semibold leading-snug text-text transition-colors">
                        {title}
                    </h3>
                    <p className="text-start text-sm font-medium uppercase tracking-widest text-text-muted">
                        {author}
                    </p>
                    {tag && (
                        <span className="max-w-30 min-w-20 rounded-full bg-babyblue-400 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary-500 backdrop-blur-sm">
                            {tag}
                        </span>
                    )}
                    {price && (
                        <p className="mt-0.5 text-start text-lg font-bold leading-relaxed text-skyblue-500">
                            {'$' + price}
                        </p>
                    )}
                </div>

                <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary-400 transition-all duration-300 group-hover:w-full" />
            </article>
        </Link>
    );
}
