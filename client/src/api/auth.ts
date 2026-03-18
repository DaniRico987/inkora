import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export async function forgotPassword(email: string, recaptchaToken: string) {
  await api.post("/auth/forgot-password", { email, recaptchaToken });
}

export async function resetPassword(
  token: string,
  newPassword: string,
  recaptchaToken: string
) {
  await api.post("/auth/reset-password", { token, newPassword, recaptchaToken });
}

