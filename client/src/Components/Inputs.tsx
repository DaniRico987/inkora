import { useState } from "react";
import type {
  InputTextProps,
  InputPasswordProps,
  InputTextAreaProps,
  InputSelectProps,
  CheckboxProps,
  InputSearchProps,
  FloatingLabelProps,
} from "../interfaces/InputsInterface";

const wrapper = "relative mb-5 mt-2";

const inputBase =
  "w-full border border-border rounded-lg px-3 py-3 text-md text-text outline-none transition duration-200 focus:border-border-focus bg-bg-input peer";

const PlaceholderBase = "placeholder:text-transparent";
// -------- Floating Label helper --------

// DESPUÉS — sale por encima del borde
function FloatingLabel({ label, lifted }: FloatingLabelProps) {
  return (
    <span
      className={`
        absolute left-3 pointer-events-none z-10
        transition-all duration-180 ease-in-out
        bg-transparent px-1                            // ✅ tapa el borde al salir
        ${lifted
          ? "-top-5 text-xs text-label"           // ✅ fuera del input
          : "top-1/2 -translate-y-1/2 text-sm text-placeholder"
        }
      `}
    >
      {label}
    </span>
  );
}

// -------- Input Text --------

export function InputText({ label, value, onChange, ...props }: InputTextProps) {
  const [focused, setFocused] = useState(false);
  const [internalVal, setInternalVal] = useState("");

  const currentVal = value !== undefined ? String(value) : internalVal;
  const isDateInput = props.type === "date";
  const lifted = isDateInput ? true : focused || currentVal.length > 0;

  return (
    <div className={wrapper}>
      <FloatingLabel label={label ?? ""} lifted={lifted} />
      <input
        className={`${inputBase} ${PlaceholderBase}`}
        value={currentVal}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          if (value === undefined) setInternalVal(e.target.value);
          onChange?.(e);
        }}
        {...props}
      />
    </div>
  );
}

// -------- Input Password --------

export function InputPassword({ label, value, onChange, ...props }: InputPasswordProps) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const [internalVal, setInternalVal] = useState("");

  const currentVal = value !== undefined ? String(value) : internalVal;
  const lifted = focused || currentVal.length > 0;

  return (
    <div className={wrapper}>
      <FloatingLabel label={label ?? ""} lifted={lifted} />
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className={`${inputBase} pr-10 ${PlaceholderBase} [&::-ms-reveal]:hidden [&::-ms-clear]:hidden`}
          value={currentVal}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            if (value === undefined) setInternalVal(e.target.value);
            onChange?.(e);
          }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {show ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

// -------- Textarea --------

export function InputTextarea({ label, value, onChange, ...props }: InputTextAreaProps) {
  const [focused, setFocused] = useState(false);
  const [internalVal, setInternalVal] = useState("");

  const currentVal = value !== undefined ? String(value) : internalVal;
  const lifted = focused || currentVal.length > 0;

  return (
    <div className={wrapper}>
      <FloatingLabel label={label ?? ""} lifted={lifted} />
      <textarea
        className={`${inputBase} min-h-22.5 resize-y ${PlaceholderBase}`}
        value={currentVal}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          if (value === undefined) setInternalVal(e.target.value);
          onChange?.(e);
        }}
        {...props}
      />
    </div>
  );
}

// -------- Select --------

export function InputSelect({ label, options, value, onChange, ...props }: InputSelectProps) {
  const [focused, setFocused] = useState(false);

  // El select siempre tiene un valor seleccionado, así que el label siempre está arriba
  const lifted = focused || true;

  return (
    <div className={wrapper}>
      <FloatingLabel label={label ?? ""} lifted={lifted} />
      <div className="relative">
        <select
          className={`${inputBase} pr-8 appearance-none cursor-pointer ${PlaceholderBase}`}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={onChange}
          {...props}
        >
          {options.map((opt) => {
            if (typeof opt === "string") {
              return <option key={opt} value={opt}>{opt}</option>;
            }
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>

        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
    </div>
  );
}

// -------- Checkbox (sin cambios) --------

export function Checkbox({ label, checked, onChange, ...props }: CheckboxProps) {
  const [internal, setInternal] = useState(false);
  const isChecked = checked !== undefined ? checked : internal;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (checked === undefined) setInternal(e.target.checked);
    onChange?.(e);
  };

  return (
    <label className="flex items-center gap-3 cursor-pointer mb-4 select-none group">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={handleChange}
        className="sr-only"
        {...props}
      />
      <span
        className={`
          w-5 h-5 rounded-full shrink-0
          border-2 transition-all duration-200
          flex items-center justify-center
          ${isChecked
            ? "bg-babyblue-800 border-border-focus"
            : "bg-transparent border-border group-hover:border-border-focus"
          }
        `}
      >
        {isChecked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <polyline points="1.5,5 4,7.5 8.5,2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label && <span className="text-sm text-text-muted">{label}</span>}
    </label>
  );
}

// -------- Input Search (sin cambios) --------

export function InputSearch({ ...props }: InputSearchProps) {
  return (
    <div className="relative mb-5">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.6" />
          <line x1="13" y1="13" x2="18" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="search"
        className={`${inputBase} pl-9 bg-transparent placeholder:text-placeholder`}
        placeholder="Buscar..."
        {...props}
      />
    </div>
  );
}