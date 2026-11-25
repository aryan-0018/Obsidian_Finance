import { apiClient } from "@/app/api-client";

export interface CategoryBudgetLimit {
  category: string;
  limit: number;
}

export interface CategoryBudgetProgress {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: "SAFE" | "WARNING" | "EXCEEDED" | "NO_LIMIT";
}

export interface BudgetProfileData {
  _id: string;
  userId: string;
  limit: number;
  currency: string;
  totalSpent?: number;
  remaining?: number;
  percentUsed?: number;
  categoryLimits: CategoryBudgetLimit[];
  categoryProgress: CategoryBudgetProgress[];
  unbudgetedSpending: Array<{ category: string; spent: number }>;
}

export const budgetApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getBudget: builder.query<{ message: string; data: BudgetProfileData }, void>({
      query: () => "/budget",
      providesTags: ["budget"],
    }),
    updateBudget: builder.mutation<
      { message: string; data: BudgetProfileData },
      { limit?: number; categoryLimits?: CategoryBudgetLimit[] }
    >({
      query: (body) => ({
        url: "/budget",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["budget", "analytics"],
    }),
  }),
});

export const { useGetBudgetQuery, useUpdateBudgetMutation } = budgetApi;
