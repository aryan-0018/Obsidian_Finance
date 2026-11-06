import { apiClient } from "@/app/api-client";
import { ChartAnalyticsResponse, ExpensePieChartBreakdownResponse, FilterParams, SummaryAnalyticsResponse } from "./anayticsType";

export interface AiAdvisorChatResponse {
  message: string;
  headline?: string;
  summary?: string;
  keyMetrics?: Array<{ label: string; value: string }>;
  bulletPoints?: string[];
  recommendation?: string;
  actionTaken?: {
    type: string;
    description: string;
    data?: any;
  };
  reply?: string;
}

export const analyticsApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    summaryAnalytics: builder.query<SummaryAnalyticsResponse, FilterParams>({
      query: ({preset, from, to}) => ({
        url: "/analytics/summary",
        method: "GET",
        params: {preset, from, to}
      }),
      providesTags: ["analytics"],
    }),
    chartAnalytics: builder.query<ChartAnalyticsResponse, FilterParams>({
      query: ({preset, from, to}) => ({
        url: "/analytics/chart",
        method: "GET",
        params: {preset, from, to}
      }),
      providesTags: ["analytics"],
    }),
    expensePieChartBreakdown: builder.query<ExpensePieChartBreakdownResponse, FilterParams  >({
      query: ({preset, from, to}) => ({
        url: "/analytics/expense-breakdown",
        method: "GET",
        params: {preset, from, to}
      }),
      providesTags: ["analytics"],
    }),
    chatWithAiAdvisor: builder.mutation<
      AiAdvisorChatResponse,
      { message: string; history?: Array<{ role: "user" | "model"; parts: string }> }
    >({
      query: (body) => ({
        url: "/analytics/ai-chat",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result?.actionTaken ? ["transactions", "analytics", "reports"] : [],
    }),
  }),
});

export const {
  useSummaryAnalyticsQuery,
  useChartAnalyticsQuery,
  useExpensePieChartBreakdownQuery,
  useChatWithAiAdvisorMutation,
} = analyticsApi;
