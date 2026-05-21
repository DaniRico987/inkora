import axios from "axios";
import { AxiosHeaders } from 'axios';
import { getAccessToken } from "../auth/session";

const api = axios.create({
  baseURL: "/api/v1",
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = AxiosHeaders.from(config.headers);
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

export type LoginPayload = {
  identifier: string;
  password: string;
  recaptchaToken?: string;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
};

export type RegisterPayload = {
  dni: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace?: string;
  address?: string;
  gender?: string;
  email: string;
  username: string;
  password: string;
  categoryIds?: number[];
};

export type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: string;
  gender?: string;
  email?: string;
  username?: string;
};

export type ChangePasswordPayload = {
  newPassword: string;
};

export type AuthApiError = {
  message?: string;
  statusCode?: number;
  requiresCaptcha?: boolean;
  failedAttempts?: number;
  attemptsRemaining?: number;
  accountBlocked?: boolean;
  blockedUntil?: string;
  remainingBlockSeconds?: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractAuthError(error: unknown): AuthApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (isObject(data)) {
      const messageField = data.message;

      if (isObject(messageField)) {
        return {
          ...(messageField as AuthApiError),
          statusCode: typeof data.statusCode === "number" ? data.statusCode : undefined,
        };
      }

      if (typeof messageField === "string") {
        return {
          ...(data as AuthApiError),
          message: messageField,
        };
      }

      return data as AuthApiError;
    }

    if (typeof data === "string") {
      return { message: data, statusCode: error.response?.status };
    }

    return {
      message: error.message || "Error de conexión con el servidor",
      statusCode: error.response?.status,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Ocurrió un error inesperado" };
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<LoginResponse>("/auth/login", payload);
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await api.post("/auth/register", payload);
  return data;
}

export async function forgotPassword(email: string, recaptchaToken: string) {
  await api.post('/auth/forgot-password', { email, recaptchaToken });
}

export async function resetPassword(
  token: string,
  newPassword: string,
  recaptchaToken: string,
) {
  await api.post('/auth/reset-password', { token, newPassword, recaptchaToken });
}

export async function getProfile() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const { data } = await api.patch('/auth/me', payload);
  return data;
}

export async function changePassword(newPassword: string) {
  const { data } = await api.post<LoginResponse>('/auth/change-password', {
    newPassword,
  });
  return data;
}

