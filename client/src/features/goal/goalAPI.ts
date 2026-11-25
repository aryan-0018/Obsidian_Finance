import { apiClient } from "@/app/api-client";

export interface SavingsGoalItem {
  _id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string | null;
  category: string;
  accountId?: { _id: string; name: string; type: string; color?: string } | string | null;
  status: "ACTIVE" | "COMPLETED";
  color: string;
  createdAt: string;
}

export interface GetAllGoalsResponse {
  message: string;
  goals: SavingsGoalItem[];
  summary: {
    totalGoals: number;
    completedGoals: number;
    totalTarget: number;
    totalSaved: number;
    overallPercent: number;
  };
}

export const goalApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    getAllGoals: builder.query<GetAllGoalsResponse, void>({
      query: () => "/goal/all",
      providesTags: ["goals"],
    }),
    createGoal: builder.mutation<
      { message: string; goal: SavingsGoalItem },
      {
        title: string;
        targetAmount: number;
        currentAmount?: number;
        deadline?: string | null;
        category?: string;
        accountId?: string | null;
        color?: string;
      }
    >({
      query: (body) => ({
        url: "/goal/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["goals"],
    }),
    contributeGoal: builder.mutation<
      { message: string; goal: SavingsGoalItem },
      {
        id: string;
        amount: number;
        action?: "DEPOSIT" | "WITHDRAW";
        accountId?: string | null;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/goal/${id}/contribute`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["goals", "accounts"],
    }),
    deleteGoal: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/goal/delete/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["goals"],
    }),
  }),
});

export const {
  useGetAllGoalsQuery,
  useCreateGoalMutation,
  useContributeGoalMutation,
  useDeleteGoalMutation,
} = goalApi;
