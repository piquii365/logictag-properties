// Axios instance: attaches the bearer token, retries a request once through
// a caller-supplied refresh handler on 401, and normalizes error responses
// into ApiError so screens can show `err.message` directly.
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

console.log("API base URL:", BASE_URL);

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let accessToken: string | null = null;
let refreshHandler: (() => Promise<boolean>) | null = null;

/** Set by AuthProvider whenever the session token changes. */
export function setSessionToken(token: string | null) {
  accessToken = token;
}

/** Set once by AuthProvider: how to silently obtain a fresh access token
 * (via the httpOnly refresh cookie) when a request comes back 401. */
export function setRefreshHandler(fn: (() => Promise<boolean>) | null) {
  refreshHandler = fn;
}

declare module "axios" {
  export interface AxiosRequestConfig {
    /** Auth endpoints themselves: skip the bearer header and the 401-retry loop. */
    skipAuth?: boolean;
    /** Internal: marks a request that has already gone through one refresh retry. */
    _retried?: boolean;
  }
}

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && !config.skipAuth) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config;
    if (
      error.response?.status === 401 &&
      config &&
      !config.skipAuth &&
      !config._retried &&
      refreshHandler
    ) {
      config._retried = true;
      const refreshed = await refreshHandler();
      if (refreshed) return client(config);
    }
    return Promise.reject(error);
  },
);

function extractMessage(error: AxiosError): string {
  const data = error.response?.data as
    { message?: string | string[] } | undefined;
  if (Array.isArray(data?.message)) return data.message.join(", ");
  if (typeof data?.message === "string") return data.message;
  if (error.request && !error.response)
    return "Can't reach the server. Check your connection.";
  return error.message || "Something went wrong.";
}

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, unknown>;
  skipAuth?: boolean;
};

export async function api<T = unknown>(
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  try {
    const res = await client.request<T>({
      url: path,
      method: opts.method ?? "GET",
      data: opts.body,
      params: opts.params,
      skipAuth: opts.skipAuth,
    });
    return res.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      throw new ApiError(err.response?.status ?? 0, extractMessage(err));
    }
    throw err;
  }
}

/** What a screen shows for a failed call, instead of the raw thrown error. */
export function apiErrorMessage(err: unknown): string {
  return err instanceof ApiError
    ? err.message
    : "Something went wrong. Please try again.";
}
