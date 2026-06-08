import type { CSSProperties, DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<
        HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          'camera-controls'?: boolean;
          ar?: boolean;
          'ar-modes'?: string;
          'environment-image'?: string;
          poster?: string;
          'shadow-intensity'?: string | number;
          'auto-rotate'?: boolean;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'manual';
          'touch-action'?: string;
          class?: string;
          style?: CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

export {};
