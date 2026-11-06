export type ReportTransaction = {
  title: string;
  category: string;
  type: string;
  amount: number;
  date: Date | string;
};

export type ReportType = {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  savingsRate: number;
  topSpendingCategories: Array<{ name: string; amount?: number; percent: number }>;
  insights: string[];
  recentTransactions?: ReportTransaction[];
};
