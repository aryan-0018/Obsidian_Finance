

export interface ReportType {
    _id: string;
    userId: string;
    period: string;
    sentDate: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
}

export interface GetAllReportResponse {
    message: string;
    reports: ReportType[];
    pagination: {
        pageSize: number;
        pageNumber: number;
        totalCount: number;
        totalPages: number;
        skip: number;
    }
}


export interface UpdateReportSettingParams {
    isEnabled: boolean;
}

export interface InstantReportResponse {
    message: string;
    data: {
        period: string;
        summary: {
            income: number;
            expenses: number;
            balance: number;
            savingsRate: number;
            topCategories: Array<{ category: string; amount: number; percentage: number }>;
        };
        insights: string[];
        recentTransactions: Array<Record<string, unknown>>;
        savedReport: ReportType;
        emailSent: boolean;
    };
}
