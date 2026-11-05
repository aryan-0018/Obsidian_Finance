import { apiClient } from "@/app/api-client";
import { GetAllReportResponse, UpdateReportSettingParams } from "./reportType";

export const reportApi = apiClient.injectEndpoints({
  endpoints: (builder) => ({
    
    getAllReports: builder.query<GetAllReportResponse, {pageNumber: number, pageSize: number}>({
      query: (params) => {
        const { pageNumber = 1, pageSize = 20 } = params;
        return ({
          url: "/report/all",
          method: "GET",
          params: { pageNumber, pageSize },
        });
      },
      providesTags: ["reports"],
    }),

    updateReportSetting: builder.mutation<void, UpdateReportSettingParams>({
      query: (payload) => ({
        url: "/report/update-setting",
        method: "PUT",
        body: payload,
      }),
      invalidatesTags: ["reports"],
    }),

    resendReport: builder.mutation<void, string>({
      query: (id) => ({
        url: `/report/resend/${id}`,
        method: "POST",
      }),
      invalidatesTags: ["reports"],
    }),

    createInstantReport: builder.mutation<
      any,
      { from?: string; to?: string; sendEmail?: boolean }
    >({
      query: (body) => ({
        url: "/report/instant",
        method: "POST",
        body,
      }),
      invalidatesTags: ["reports"],
    }),
  }),
});

export const {
    useGetAllReportsQuery,
    useUpdateReportSettingMutation,
    useResendReportMutation,
    useCreateInstantReportMutation,
} = reportApi;
