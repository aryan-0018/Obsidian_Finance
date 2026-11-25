import { apiClient } from "@/app/api-client";

export type AccountTypeEnum =
  | "BANK"
  | "CREDIT_CARD"
  | "CASH"
  | "WALLET"
  | "INVESTMENT";

export interface AccountItem {
  _id: string;
  id?: string;
  userId: string;
  name: string;
  type: AccountTypeEnum;
  institution?: string;
  accountMask?: string | null;
  balance: number;
  creditLimit?: number;
  currency: string;
  isDefault: boolean;
  color: string;
  createdAt: string;
}

export interface GetAllAccountsResponse {
  message: string;
  accounts: AccountItem[];
  summary: {
    totalAssets: number;
    totalCreditDebt: number;
    netBalance: number;
    totalCreditLimit: number;
    accountCount: number;
  };
}

export const accountApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getAllAccounts: builder.query<GetAllAccountsResponse, void>({
      query: () => "/account/all",
      providesTags: ["accounts"],
    }),
    createAccount: builder.mutation<
      { message: string; account: AccountItem },
      {
        name: string;
        type: AccountTypeEnum;
        institution?: string;
        accountMask?: string | null;
        balance?: number;
        creditLimit?: number;
        isDefault?: boolean;
        color?: string;
      }
    >({
      query: (body) => ({
        url: "/account/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["accounts"],
    }),
    updateAccount: builder.mutation<
      { message: string; account: AccountItem },
      {
        id: string;
        body: Partial<{
          name: string;
          type: AccountTypeEnum;
          institution: string;
          accountMask: string | null;
          balance: number;
          creditLimit: number;
          isDefault: boolean;
          color: string;
        }>;
      }
    >({
      query: ({ id, body }) => ({
        url: `/account/update/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["accounts", "transactions"],
    }),
    deleteAccount: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/account/delete/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["accounts", "transactions"],
    }),
    transferAccounts: builder.mutation<
      { message: string },
      {
        fromAccountId: string;
        toAccountId: string;
        amount: number;
        title?: string;
        description?: string;
        date?: string;
      }
    >({
      query: (body) => ({
        url: "/account/transfer",
        method: "POST",
        body,
      }),
      invalidatesTags: ["accounts", "transactions", "analytics"],
    }),
  }),
});

export const {
  useGetAllAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useTransferAccountsMutation,
} = accountApi;
