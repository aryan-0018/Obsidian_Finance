export interface FilterParams {
  preset?: string;
  from?: string;
  to?: string;
}

interface PercentageChange {
  income: number;
  expenses: number;
  balance: number;
  prevPeriodFrom: string | null;
  prevPeriodTo: string | null;
}

interface PresetType {
  from: string;
  to: string;
  value: string;
  label: string;
}

export interface SummaryAnalyticsResponse {
  message: string;
  data: {
    availableBalance: number;
    totalPortfolioBalance?: number;
    basePortfolioBalance?: number;
    remainingBudget?: number;
    budgetLimit?: number;
    totalIncome: number;
    totalExpenses: number;
    transactionCount: number;
    savingRate: {
      percentage: number;
      expenseRatio: number;
    };
    runwayMetrics?: {
      dailyBurnRate: number;
      projectedMonthlyExpense: number;
      runwayMonths: string;
      healthScore: number;
      healthRating: string;
    };
    percentageChange: PercentageChange;
    preset: PresetType;
  };
}

export interface ChartAnalyticsResponse {
  message: string;
  data: {
    chartData: {
      date: string;
      income: number;
      expenses: number;
    }[];
    totalIncomeCount: number;
    totalExpenseCount: number;
    preset: PresetType;
  };
}

export interface ExpensePieChartBreakdownResponse {
  message: string;
  data: {
    totalSpent: number;
    breakdown: {
      name: string;
      value: number;
      percentage: number;
    }[];
    preset: PresetType;
  };
}

export interface FreedomMilestone {
  id: string;
  label: string;
  description: string;
  targetDays: number;
  targetAmount: number;
  isAchieved: boolean;
  progress: number;
  daysRemaining: number;
}

export interface FreedomMetricsResponse {
  message: string;
  data: {
    currentNetWealth: number;
    dailyBurnRate: number;
    costPerDay: number;
    totalFreedomDays: number;
    formattedRunway: string;
    years: number;
    months: number;
    days: number;
    freedomVelocityDays: number;
    thisMonthNetCashFlow: number;
    milestones: FreedomMilestone[];
    currency: string;
  };
}

export interface PurchaseSimulationResponse {
  message: string;
  data: {
    purchaseTitle: string;
    purchaseAmount: number;
    freedomDaysCost: number;
    currentFreedomDays: number;
    postPurchaseFreedomDays: number;
    currentNetWealth: number;
    postPurchaseNetWealth: number;
    liquidBufferAfterBills: number;
    upcomingRecurringBills: number;
    emergencyFloor: number;
    verdict: "SAFE" | "CONDITIONAL" | "HIGH_RISK";
    headline: string;
    recommendation: string;
    tradeOffAdvice: string | null;
    upcomingBills: Array<{
      title: string;
      amount: number;
      date: string;
    }>;
  };
}

export interface LiquidityRadarDay {
  date: string;
  dayLabel: string;
  balance: number;
  dailyBurn: number;
  inflows: number;
  outflows: number;
  events: string[];
}

export interface LiquidityRadarResponse {
  message: string;
  data: {
    currentNetWealth: number;
    dailyBurnRate: number;
    trajectory: LiquidityRadarDay[];
    valley: {
      date: string;
      dayLabel: string;
      balance: number;
      safetyDays: number;
      riskLevel: "DEFICIT" | "TIGHT" | "OPTIMAL";
      description: string;
    };
    thirtyDayNetChange: number;
  };
}
