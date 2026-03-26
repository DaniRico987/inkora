export type SnackbarStatus = "info" | "warning" | "success" | "error";

export type SnackbarPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface ShowSnackbarInput {
  message: string;
  status: SnackbarStatus;
  /** Milisegundos. Default: 3500 */
  durationMs?: number;
  /** Si se provee, evita duplicados por esta clave. */
  dedupeKey?: string;
}

export interface SnackbarConfig {
  position?: SnackbarPosition;
  maxVisible?: number;
  maxQueue?: number;
  dedupeWindowMs?: number;
}

