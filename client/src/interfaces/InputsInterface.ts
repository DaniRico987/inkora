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

export type InputValidationType = "name" | "address" | "email" | "username" | "dni" | "numeric" | "none";

export interface InputTextProps
  extends BaseInputProps,
  InputHTMLAttributes<HTMLInputElement> {
  validationType?: InputValidationType;
  hideLabelOnFocus?: boolean;
}

export interface InputNumberProps
  extends BaseInputProps,
  InputHTMLAttributes<HTMLInputElement> {
  length?: number;
  hideLabelOnFocus?: boolean;
}

export interface InputDateProps
  extends BaseInputProps,
  InputHTMLAttributes<HTMLInputElement> {
  calendarIconClassName?: string;
  dateValidationMode?: "auto" | "birthDate" | "publicationDate" | "futureDate" | "cardExpiration" | "none";
  datePickerMode?: "day" | "monthYear";
  hideLabelOnFocus?: boolean;
}

export interface InputPasswordProps
  extends BaseInputProps,
  InputHTMLAttributes<HTMLInputElement> { }

export interface InputTextAreaProps
  extends BaseInputProps,
  TextareaHTMLAttributes<HTMLTextAreaElement> { }

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

