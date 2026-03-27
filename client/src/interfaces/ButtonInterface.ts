
export type Variant = "primary" | "secondary" | "destructive" | "tags-active" | "tags";

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  size?: string;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}