import { type AuthResponse, requestApi } from "./api-client";

export const demoCredentials = {
  email: "demo@insighthub.dev",
  password: "password123",
};

type AuthStorageOptions = {
  notify?: boolean;
};

export async function signInDemoAccount() {
  const result = await requestApi<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(demoCredentials),
  });

  storeAuthSession(result);
  return result;
}

export function storeAuthSession(
  result: AuthResponse,
  options: AuthStorageOptions = {},
) {
  localStorage.setItem("insighthub.accessToken", result.accessToken);
  localStorage.setItem("insighthub.userEmail", result.user.email);

  if (options.notify !== false) {
    notifyAuthSessionChanged();
  }
}

export function clearAuthSession(options: AuthStorageOptions = {}) {
  localStorage.removeItem("insighthub.accessToken");
  localStorage.removeItem("insighthub.userEmail");
  localStorage.removeItem("insighthub.projectId");
  localStorage.removeItem("insighthub.projectApiKey");

  if (options.notify !== false) {
    notifyAuthSessionChanged();
  }
}

export function getStoredUserEmail() {
  return localStorage.getItem("insighthub.userEmail");
}

export function getStoredAccessToken() {
  return localStorage.getItem("insighthub.accessToken");
}

function notifyAuthSessionChanged() {
  window.dispatchEvent(new Event("insighthub:auth-session-changed"));
}
