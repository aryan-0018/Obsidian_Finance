import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { RootState } from "./store";
import { logout, updateCredentials } from "@/features/auth/authSlice";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const auth = (getState() as RootState).auth;
    if (auth?.accessToken) {
      headers.set("Authorization", `Bearer ${auth.accessToken}`);
    }
    return headers;
  },
});

let refreshPromise: Promise<boolean> | null = null;

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  const reqUrl = typeof args === "string" ? args : args.url;
  const isAuthEndpoint =
    reqUrl.includes("/auth/login") ||
    reqUrl.includes("/auth/register") ||
    reqUrl.includes("/auth/google") ||
    reqUrl.includes("/auth/refresh-token");

  if (result.error && result.error.status === 401 && !isAuthEndpoint) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refreshResult = await baseQuery(
          { url: "/auth/refresh-token", method: "POST" },
          api,
          extraOptions
        );

        if (refreshResult.data && typeof refreshResult.data === "object") {
          const data = refreshResult.data as {
            accessToken?: string;
            expiresAt?: number;
          };
          if (data.accessToken) {
            api.dispatch(
              updateCredentials({
                accessToken: data.accessToken,
                expiresAt: data.expiresAt,
              })
            );
            return true;
          }
        }
        return false;
      })().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logout());
      api.dispatch(apiClient.util.resetApiState());
    }
  }

  return result;
};

export const apiClient = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: [
    "transactions",
    "analytics",
    "billingSubscription",
    "budget",
    "reports",
    "user",
    "telegram",
    "apiKey",
    "accounts",
    "goals",
    "splits",
    "subscriptions",
  ],
  endpoints: () => ({}),
});
