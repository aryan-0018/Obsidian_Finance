import { apiClient } from "@/app/api-client";

export interface SplitItem {
  _id: string;
  userId: string;
  title: string;
  direction: "OWED_TO_ME" | "I_OWE";
  counterpartyName: string;
  counterpartyContact?: string;
  totalAmount: number;
  counterpartyShare: number;
  settledAmount: number;
  status: "PENDING" | "PARTIAL" | "SETTLED";
  category: string;
  accountId?: { _id: string; name: string; type: string; color?: string } | string | null;
  dueDate?: string | null;
  notes?: string;
  settledAt?: string | null;
  createdAt: string;
}

export interface GetAllSplitsResponse {
  message: string;
  splits: SplitItem[];
  summary: {
    totalOwedToMe: number;
    totalIOwe: number;
    netReceivable: number;
    pendingCount: number;
    totalCount: number;
  };
}

export const splitApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getAllSplits: builder.query<GetAllSplitsResponse, void>({
      query: () => "/split/all",
      providesTags: ["splits"],
    }),
    createSplit: builder.mutation<
      { message: string; split: SplitItem },
      {
        title: string;
        direction: "OWED_TO_ME" | "I_OWE";
        counterpartyName: string;
        counterpartyContact?: string;
        totalAmount: number;
        counterpartyShare: number;
        category?: string;
        accountId?: string | null;
        dueDate?: string | null;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/split/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["splits"],
    }),
    settleSplit: builder.mutation<
      { message: string },
      {
        id: string;
        amount?: number;
        accountId?: string | null;
        logTransaction?: boolean;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/split/${id}/settle`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["splits", "transactions", "accounts", "analytics"],
    }),
    deleteSplit: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/split/delete/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["splits"],
    }),
  }),
});

export const {
  useGetAllSplitsQuery,
  useCreateSplitMutation,
  useSettleSplitMutation,
  useDeleteSplitMutation,
} = splitApi;
