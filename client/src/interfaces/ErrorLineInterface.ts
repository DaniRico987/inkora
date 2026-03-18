export type ErrorLineCountdown =
  | { seconds: number; expiresAtMs?: never }
  | { expiresAtMs: number; seconds?: never };

export interface ErrorLineProps {
  /** Por defecto: "Tu cuenta ha sido bloqueada temporalmente por seguridad." */
  title?: string;
  /** Intentos fallidos actuales y máximo (render: "Intentos fallidos: X/Y") */
  failedAttempts: { current: number; max: number };
  className?: string;

  /**
   * Cuenta regresiva opcional.
   * - seconds: inicia desde N segundos
   * - expiresAtMs: tiempo objetivo (Date.now() en ms)
   */
  countdown?: ErrorLineCountdown;

  /** Texto antes del tiempo, por ejemplo: "Tiempo restante:" (rojo) */
  countdownLabel?: string;

  /** Se dispara una vez al llegar a 0. */
  onExpire?: () => void;
}

