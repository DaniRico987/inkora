
import type { ButtonProps, Variant } from "../interfaces/ButtonInterface";


const variantStyles: Record<Variant, string> = {
  primary: 'bg-primary-500 text-white',
  secondary: "bg-babyblue-500 text-primary-500",
  destructive: "bg-red-600 text-white",
};


export function Button({
  children,
  onClick,
  variant = "primary",
  size,
  disabled = false,
  loading = false,
  type = "button",
  className = "",
}: ButtonProps) {
  return (
    <div className="w-full flex justify-center">
      <button
        type={type}
        onClick={onClick}
        disabled={disabled || loading}
        style={{width: size || "100%"}}
        className={`
        rounded-lg
        transition
        ease-in-out
        flex items-center gap-2
        justify-center
        py-2 px-4
        w-full h-auto
        text-[1rem]
        hover:font-medium
        ${variantStyles[variant]}
        ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}
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