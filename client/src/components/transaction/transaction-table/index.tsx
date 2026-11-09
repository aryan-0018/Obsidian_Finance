import { DataTable } from "@/components/data-table";
import { transactionColumns } from "./column";
import { _TRANSACTION_TYPE, _TransactionType, CATEGORIES } from "@/constant";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import useDebouncedSearch from "@/hooks/use-debounce-search";
import {
  useBulkDeleteTransactionMutation,
  useGetAllTransactionsQuery,
} from "@/features/transaction/transactionAPI";
import { toast } from "sonner";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  subDays,
  startOfYear,
  endOfYear,
  subYears,
  endOfDay,
} from "date-fns";

type FilterType = {
  type?: _TransactionType | undefined;
  recurringStatus?: "RECURRING" | "NON_RECURRING" | undefined;
  category?: string | undefined;
  period?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  pageNumber?: number;
  pageSize?: number;
};

const computePeriodRange = (period?: string) => {
  if (!period) return { from: undefined, to: undefined };
  const now = new Date();
  const today = endOfDay(now);
  switch (period) {
    case "THIS_MONTH":
      return {
        from: startOfMonth(today).toISOString(),
        to: today.toISOString(),
      };
    case "LAST_MONTH": {
      const prevMonth = subMonths(today, 1);
      return {
        from: startOfMonth(prevMonth).toISOString(),
        to: endOfDay(endOfMonth(prevMonth)).toISOString(),
      };
    }
    case "THIS_QUARTER":
      return {
        from: startOfQuarter(today).toISOString(),
        to: today.toISOString(),
      };
    case "LAST_QUARTER": {
      const prevQ = subQuarters(today, 1);
      return {
        from: startOfQuarter(prevQ).toISOString(),
        to: endOfQuarter(prevQ).toISOString(),
      };
    }
    case "LAST_30_DAYS":
      return {
        from: subDays(today, 29).toISOString(),
        to: today.toISOString(),
      };
    case "LAST_3_MONTHS": {
      const threeMonthsAgo = subMonths(today, 3);
      return {
        from: startOfMonth(threeMonthsAgo).toISOString(),
        to: today.toISOString(),
      };
    }
    case "THIS_YEAR":
      return {
        from: startOfYear(today).toISOString(),
        to: today.toISOString(),
      };
    case "LAST_YEAR": {
      const prevYear = subYears(today, 1);
      return {
        from: startOfYear(prevYear).toISOString(),
        to: endOfDay(endOfYear(prevYear)).toISOString(),
      };
    }
    default:
      return { from: undefined, to: undefined };
  }
};

const TransactionTable = (props: {
  pageSize?: number;
  isShowPagination?: boolean;
}) => {
  const [searchParams] = useSearchParams();
  const urlKeyword = searchParams.get("keyword") || "";
  const urlCategory = searchParams.get("category") || "";
  const urlType = (searchParams.get("type") as _TransactionType) || undefined;

  const [filter, setFilter] = useState<FilterType>({
    type: urlType,
    recurringStatus: undefined,
    category: urlCategory || undefined,
    period: undefined,
    from: undefined,
    to: undefined,
    pageNumber: 1,
    pageSize: props.pageSize || 10,
  });

  const { debouncedTerm, setSearchTerm } = useDebouncedSearch(urlKeyword, {
    delay: 500,
  });

  useEffect(() => {
    if (urlKeyword && urlKeyword !== debouncedTerm) {
      setSearchTerm(urlKeyword);
    }
  }, [urlKeyword]);

  const [bulkDeleteTransaction, { isLoading: isBulkDeleting }] =
    useBulkDeleteTransactionMutation();

  const { data, isFetching } = useGetAllTransactionsQuery({
    keyword: debouncedTerm,
    type: filter.type,
    recurringStatus: filter.recurringStatus,
    category: filter.category,
    from: filter.from,
    to: filter.to,
    pageNumber: filter.pageNumber,
    pageSize: filter.pageSize,
  });

  const transactions = data?.transations || [];
  const pagination = {
    totalItems: data?.pagination?.totalCount || 0,
    totalPages: data?.pagination?.totalPages || 0,
    pageNumber: filter.pageNumber,
    pageSize: filter.pageSize,
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (filters: Record<string, string>) => {
    const { type, frequently, category, period } = filters;
    const { from, to } = computePeriodRange(period);
    setFilter((prev) => ({
      ...prev,
      type: (type as _TransactionType) || undefined,
      recurringStatus: (frequently as "RECURRING" | "NON_RECURRING") || undefined,
      category: category || undefined,
      period: period || undefined,
      from,
      to,
      pageNumber: 1,
    }));
  };

  const handlePageChange = (pageNumber: number) => {
    setFilter((prev) => ({ ...prev, pageNumber }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setFilter((prev) => ({ ...prev, pageSize, pageNumber: 1 }));
  };

  const handleBulkDelete = (transactionIds: string[]) => {
    bulkDeleteTransaction(transactionIds)
      .unwrap()
      .then(() => {
        toast.success("Transactions deleted successfully");
      })
      .catch((error) => {
        toast.error(error.data?.message || "Failed to delete transactions");
      });
  };

  return (
    <DataTable
      data={transactions}
      columns={transactionColumns}
      searchPlaceholder="Search transactions..."
      initialSearchTerm={urlKeyword}
      initialFilters={{
        ...(urlType ? { type: urlType } : {}),
        ...(urlCategory ? { category: urlCategory } : {}),
      }}
      isLoading={isFetching}
      isBulkDeleting={isBulkDeleting}
      isShowPagination={props.isShowPagination}
      pagination={pagination}
      filters={[
        {
          key: "type",
          label: "All Types",
          options: [
            { value: _TRANSACTION_TYPE.INCOME, label: "Income" },
            { value: _TRANSACTION_TYPE.EXPENSE, label: "Expense" },
          ],
        },
        {
          key: "category",
          label: "All Categories",
          options: CATEGORIES.map((c) => ({
            value: c.value,
            label: c.label,
          })),
        },
        {
          key: "period",
          label: "Time Period",
          options: [
            { value: "THIS_MONTH", label: "This Month" },
            { value: "LAST_MONTH", label: "Last Month" },
            { value: "THIS_QUARTER", label: "This Quarter" },
            { value: "LAST_QUARTER", label: "Last Quarter" },
            { value: "LAST_30_DAYS", label: "Last 30 Days" },
            { value: "LAST_3_MONTHS", label: "Last 3 Months" },
            { value: "THIS_YEAR", label: "This Year" },
            { value: "LAST_YEAR", label: "Last Year" },
          ],
        },
        {
          key: "frequently",
          label: "Frequency",
          options: [
            { value: "RECURRING", label: "Recurring" },
            { value: "NON_RECURRING", label: "Non-Recurring" },
          ],
        },
      ]}
      onSearch={handleSearch}
      onPageChange={(pageNumber) => handlePageChange(pageNumber)}
      onPageSizeChange={(pageSize) => handlePageSizeChange(pageSize)}
      onFilterChange={(filters) => handleFilterChange(filters)}
      onBulkDelete={handleBulkDelete}
    />
  );
};
export default TransactionTable;
