export const SESSION_STORAGE_KEYS = {
  accessToken: 'inkora_access_token',
  authReturnTo: 'inkora.auth.returnTo',
  reservationCartMap: 'inkora:reservation_cart_map',
} as const;

export const SESSION_INACTIVITY_MINUTES = Number(
  import.meta.env.VITE_SESSION_INACTIVITY_MINUTES ?? 15,
);

export const SESSION_WARNING_MINUTES = Number(
  import.meta.env.VITE_SESSION_WARNING_MINUTES ?? 2,
);

export const SESSION_INACTIVITY_MS = SESSION_INACTIVITY_MINUTES * 60 * 1000;
export const SESSION_WARNING_MS = SESSION_WARNING_MINUTES * 60 * 1000;
