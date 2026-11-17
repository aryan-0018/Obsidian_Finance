import { apiClient } from "@/app/api-client";
import {
  UpdateUserResponse,
  TelegramStatusResponse,
  TelegramPairCodeResponse,
  GetCurrentUserResponse,
  ApiKeyStatusResponse,
  GenerateApiKeyResponse,
} from "./userType";

export const userApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUser: builder.query<GetCurrentUserResponse, void>({
      query: () => "/user/current-user",
      providesTags: ["user"],
    }),
    updateUser: builder.mutation<UpdateUserResponse, FormData>({
      query: (formData) => ({
        url: "/user/update",
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["user"],
    }),
    getTelegramStatus: builder.query<TelegramStatusResponse, void>({
      query: () => "/user/telegram/status",
      providesTags: ["telegram"],
    }),
    generateTelegramPairCode: builder.mutation<TelegramPairCodeResponse, void>({
      query: () => ({
        url: "/user/telegram/pair-code",
        method: "POST",
      }),
    }),
    unlinkTelegram: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/user/telegram/unlink",
        method: "DELETE",
      }),
      invalidatesTags: ["telegram"],
    }),
    getApiKeyStatus: builder.query<ApiKeyStatusResponse, void>({
      query: () => "/user/api-key",
      providesTags: ["apiKey"],
    }),
    generateApiKey: builder.mutation<GenerateApiKeyResponse, void>({
      query: () => ({
        url: "/user/api-key",
        method: "POST",
      }),
      invalidatesTags: ["apiKey"],
    }),
    revokeApiKey: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/user/api-key",
        method: "DELETE",
      }),
      invalidatesTags: ["apiKey"],
    }),
    testSmsIngest: builder.mutation<
      { success: boolean; message: string; data?: Record<string, unknown>; isDuplicate?: boolean },
      { message: string; sender?: string; apiKey: string }
    >({
      query: ({ message, sender, apiKey }) => ({
        url: "/sms/ingest",
        method: "POST",
        headers: {
          "x-api-key": apiKey,
        },
        body: { message, sender },
      }),
      invalidatesTags: ["transactions", "analytics"],
    }),
  }),
});

export const {
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useUpdateUserMutation,
  useGetTelegramStatusQuery,
  useGenerateTelegramPairCodeMutation,
  useUnlinkTelegramMutation,
  useGetApiKeyStatusQuery,
  useGenerateApiKeyMutation,
  useRevokeApiKeyMutation,
  useTestSmsIngestMutation,
} = userApi;

