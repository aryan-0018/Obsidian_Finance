import { apiClient } from "@/app/api-client";
import {
  UpdateUserResponse,
  TelegramStatusResponse,
  TelegramPairCodeResponse,
} from "./userType";

export const userApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
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
  }),
});

export const {
  useUpdateUserMutation,
  useGetTelegramStatusQuery,
  useGenerateTelegramPairCodeMutation,
  useUnlinkTelegramMutation,
} = userApi;

