import type { ButtonProps, Variant } from '../interfaces/ButtonInterface';

const variantStyles: Record<Variant, string> = {
  primary: 'bg-primary-500 text-white hover:font-medium rounded-lg',
  secondary: 'bg-babyblue-500 text-primary-500 hover:font-medium rounded-lg',
  destructive: 'bg-red-600 text-white hover:font-medium rounded-lg',
  'tags-active': 'bg-primary-500 text-babyblue-100 font-medium border-border rounded-full',
  'tags': 'bg-bg-input text-text hover:text-primary-300 rounded-full',
};

export function Button({
  children,
  onClick,
  variant = 'primary',
  size,
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
}: ButtonProps) {
  return (
    <div className={variant==="tags" || variant==="tags-active"?"w-auto":"w-full flex justify-center"}>
      <button
        type={type}
        onClick={onClick}
        disabled={disabled || loading}
        style={{ width: size === 'full' ? '100%' : size ? size : '100%' }}
        className={`
        cursor-pointer
        transition
        ease-in-out
        flex items-center gap-2
        justify-center
        py-2 px-4
        h-auto
        text-[1rem]
        m-auto
        ${variantStyles[variant]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      >
        {loading && (
          <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
        )}
        {children}
      </button>
    </div>
  );
}
