import { apiClient } from "@/app/api-client";
import {
  ChartAnalyticsResponse,
  ExpensePieChartBreakdownResponse,
  FilterParams,
  SummaryAnalyticsResponse,
  FreedomMetricsResponse,
  PurchaseSimulationResponse,
  LiquidityRadarResponse,
} from "./anayticsType";

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
    data?: Record<string, unknown>;
  };
  reply?: string;
}

export interface VoiceTerminalCommandResponse {
  message: string;
  data: {
    action:
      | "NAVIGATE"
      | "TRANSACTION_CREATED"
      | "TRANSACTION_DELETED"
      | "TRANSACTION_UPDATED"
      | "FINANCIAL_QUERY"
      | "EXPORT_ACTION"
      | "GENERAL_HELP"
      | "OPEN_MODAL"
      | "AUDIT_LEDGER"
      | "BUDGET_UPDATED"
      | "TELEGRAM_ACTION";
    path?: string;
    modalTarget?:
      | "ADD_TRANSACTION"
      | "IMPORT_STATEMENT"
      | "RECEIPT_SCANNER"
      | "LEDGER_AUDIT"
      | "TELEGRAM_COPILOT";
    speechReply: string;
    displayHeadline?: string;
    displayText?: string;
    metrics?: Array<{ label: string; value: string }>;
    transactionData?: Record<string, unknown>;
    auditData?: Record<string, unknown>;
    telegramData?: Record<string, unknown>;
  };
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
    getAiInsights: builder.mutation<
      { data: string[] | string },
      FilterParams
    >({
      query: (params) => ({
        url: "/analytics/ai-insights",
        method: "GET",
        params,
      }),
    }),
    chatWithAiAdvisor: builder.mutation<
      AiAdvisorChatResponse,
      {
        message: string;
        history?: Array<{ role: "user" | "model"; parts: string }>;
        currentRange?: {
          label?: string;
          value?: string;
          from?: string | Date;
          to?: string | Date;
        };
      }
    >({
      query: (body) => ({
        url: "/analytics/ai-chat",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) =>
        result?.actionTaken
          ? [
              "transactions",
              "analytics",
              "reports",
              "budget",
              "telegram",
              "accounts",
              "subscriptions",
            ]
          : [],
    }),
    processVoiceCommand: builder.mutation<
      VoiceTerminalCommandResponse,
      { transcript: string }
    >({
      query: (body) => ({
        url: "/analytics/voice-command",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) => {
        const action = result?.data?.action;
        if (
          action === "TRANSACTION_CREATED" ||
          action === "TRANSACTION_DELETED" ||
          action === "TRANSACTION_UPDATED"
        ) {
          return [
            "transactions",
            "analytics",
            "reports",
            "budget",
            "accounts",
            "subscriptions",
          ];
        }
        if (action === "BUDGET_UPDATED") {
          return ["budget", "analytics"];
        }
        if (action === "TELEGRAM_ACTION") {
          return ["telegram", "user"];
        }
        return [];
      },
    }),
    getFreedomMetrics: builder.query<FreedomMetricsResponse, void>({
      query: () => "/analytics/freedom-clock",
      providesTags: ["analytics", "transactions"],
    }),
    simulatePurchase: builder.mutation<
      PurchaseSimulationResponse,
      { amount: number; title: string; category?: string }
    >({
      query: (body) => ({
        url: "/analytics/simulate-purchase",
        method: "POST",
        body,
      }),
    }),
    getLiquidityRadar: builder.query<LiquidityRadarResponse, void>({
      query: () => "/analytics/liquidity-radar",
      providesTags: ["analytics", "transactions"],
    }),
    getSubscriptionRadar: builder.query<
      {
        message: string;
        data: {
          subscriptions: Array<{
            id: string;
            title: string;
            amount: number;
            category: string;
            interval: string;
            nextDueDate: string;
            daysUntilDue: number;
            monthlyEquivalent: number;
            source: "EXPLICIT" | "DETECTED";
            occurrences: number;
          }>;
          summary: {
            count: number;
            totalMonthlyRecurring: number;
            upcoming7DaysCount: number;
            upcoming7DaysTotal: number;
          };
        };
      },
      void
    >({
      query: () => "/analytics/subscriptions",
      providesTags: ["subscriptions", "transactions"],
    }),
    getWeeklyDigest: builder.query<
      {
        message: string;
        data: {
          userName: string;
          currency: string;
          thisWeekExpenses: number;
          lastWeekExpenses: number;
          thisWeekIncome: number;
          deltaPercent: number;
          topCategories: Array<{ category: string; amount: number }>;
          upcomingRenewals: Array<{ title: string; amount: number; daysUntilDue: number }>;
        };
      },
      void
    >({
      query: () => "/analytics/weekly-digest",
      providesTags: ["analytics", "transactions"],
    }),
    sendWeeklyDigest: builder.mutation<{ message: string; sent: boolean }, void>({
      query: () => ({
        url: "/analytics/send-digest",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useSummaryAnalyticsQuery,
  useChartAnalyticsQuery,
  useExpensePieChartBreakdownQuery,
  useGetAiInsightsMutation,
  useChatWithAiAdvisorMutation,
  useProcessVoiceCommandMutation,
  useGetFreedomMetricsQuery,
  useSimulatePurchaseMutation,
  useGetLiquidityRadarQuery,
  useGetSubscriptionRadarQuery,
  useGetWeeklyDigestQuery,
  useSendWeeklyDigestMutation,
} = analyticsApi;
