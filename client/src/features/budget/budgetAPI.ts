import { apiClient } from "@/app/api-client";

export const budgetApi = apiClient.injectEndpoints({
    endpoints: (builder) => ({
        getBudget: builder.query({
            query: () => "/budget",
            providesTags: ["budget"],
        }),
        updateBudget: builder.mutation({
            query: (body: { limit: number }) => ({
                url: "/budget",
                method: "PUT",
                body,
            }),
            invalidatesTags: ["budget", "analytics"],
        }),
    }),
});

export const { useGetBudgetQuery, useUpdateBudgetMutation } = budgetApi;
