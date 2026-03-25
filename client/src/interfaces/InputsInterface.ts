import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";

export interface FloatingLabelProps {
  label: ReactNode;
  lifted: boolean;
}

export interface BaseInputProps {
  label: ReactNode;
}

export interface InputTextProps
  extends BaseInputProps,
    InputHTMLAttributes<HTMLInputElement> {}

export interface InputPasswordProps
  extends BaseInputProps,
    InputHTMLAttributes<HTMLInputElement> {}

export interface InputTextAreaProps
  extends BaseInputProps,
    TextareaHTMLAttributes<HTMLTextAreaElement> {}

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface InputSelectProps
  extends BaseInputProps,
    SelectHTMLAttributes<HTMLSelectElement> {
  options: (SelectOption | string)[];
}

export interface CheckboxProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
}

export interface InputSearchProps
  extends InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
}

