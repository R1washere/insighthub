export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export type AuthResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
  };
  accessToken: string;
};

export async function requestApi<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      typeof errorBody?.message === "string"
        ? errorBody.message
        : "Request failed";

    throw new Error(message);
  }

  return response.json();
}
