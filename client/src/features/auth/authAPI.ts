import { apiClient } from "@/app/api-client";
import type {
  GoogleLoginPayload,
  LoginPayload,
  LoginResponse,
  RefreshTokenResponse,
  RegisterPayload,
  RegisterResponse,
} from "./authType";

export const authApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<RegisterResponse, RegisterPayload>({
      query: (credentials) => ({
        url: "/auth/register",
        method: "POST",
        body: credentials,
      }),
    }),
    login: builder.mutation<LoginResponse, LoginPayload>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    googleLogin: builder.mutation<LoginResponse, GoogleLoginPayload>({
      query: (credentials) => ({
        url: "/auth/google",
        method: "POST",
        body: credentials,
      }),
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
    }),
    refresh: builder.mutation<RefreshTokenResponse, void | Record<string, never>>({
      query: () => ({
        url: "/auth/refresh-token",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGoogleLoginMutation,
} = authApi;
