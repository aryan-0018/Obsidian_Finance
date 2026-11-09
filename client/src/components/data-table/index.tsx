/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
  SortingState,
  VisibilityState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Loader, PlusCircleIcon, Trash, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import TableSkeleton from "./table-skeleton-loader";
import { DataTablePagination } from "./table-pagination";
import { EmptyState } from "../empty-state";

interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  searchPlaceholder?: string;
  showSearch?: boolean;
  filters?: FilterOption[];
  className?: string;
  initialSearchTerm?: string;
  initialFilters?: Record<string, string>;
  onSearch?: (term: string) => void;
  onFilterChange?: (filters: Record<string, string>) => void;
  onBulkDelete?: (selectedIds: string[]) => void;
  selection?: boolean;
  isLoading?: boolean;
  isBulkDeleting?: boolean;
  isShowPagination?: boolean;
  pagination?: {
    totalItems?: number;
    totalPages?: number;
    pageNumber?: number;
    pageSize?: number;
  };
  onPageChange?: (pageNumber: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function DataTable<TData>({
  data,
  columns,
  searchPlaceholder = "Search...",
  showSearch = true,
  filters = [],
  className,
  onSearch,
  onFilterChange,
  onBulkDelete,
  selection = true,
  isLoading = false,
  isBulkDeleting = false,
  isShowPagination = true,
  pagination,
  initialSearchTerm = "",
  initialFilters = {},
  onPageChange,
  onPageSizeChange,
}: DataTableProps<TData>) {
  const [searchTerm, setSearchTerm] = React.useState(initialSearchTerm);
  const [filterValues, setFilterValues] = React.useState<
    Record<string, string>
  >(initialFilters);

  React.useEffect(() => {
    if (initialSearchTerm !== undefined && initialSearchTerm !== searchTerm) {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  React.useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      setFilterValues((prev) => ({ ...prev, ...initialFilters }));
    }
  }, [initialFilters]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection: selection ? rowSelection : {},
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: selection ? setRowSelection : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelections = selectedRows.length > 0;

  const selectedSum = React.useMemo(() => {
    if (!hasSelections) return null;
    let total = 0;
    let hasNumeric = false;
    for (const row of selectedRows) {
      const item = row.original as any;
      if (typeof item?.amount === "number") {
        hasNumeric = true;
        if (item.type === "EXPENSE") {
          total -= item.amount;
        } else {
          total += item.amount;
        }
      }
    }
    return hasNumeric ? total : null;
  }, [selectedRows, hasSelections]);

  const exportToCsv = (rowsToExport: typeof selectedRows) => {
    if (!rowsToExport.length) return;
    const items = rowsToExport.map((r) => r.original as Record<string, any>);
    const keys = Array.from(
      new Set(
        items.flatMap((item) =>
          Object.keys(item).filter(
            (k) => !["_id", "__v", "userId", "updatedAt"].includes(k)
          )
        )
      )
    );

    const csvRows = [
      keys.join(","),
      ...items.map((item) =>
        keys
          .map((k) => {
            const val = item[k];
            if (val === null || val === undefined) return '""';
            if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `obsidian_selected_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch?.(value);
  };

  const handleFilterChange = (key: string, value: string) => {
    const updated = { ...filterValues, [key]: value };
    setFilterValues(updated);
    onFilterChange?.(updated);
  };

  const handleClear = () => {
    setSearchTerm("");
    setFilterValues({});
    onSearch?.("");
    onFilterChange?.({});
    setRowSelection({});
  };

  const handleDelete = () => {
    const selectedIds = selectedRows
      .map((row) => {
        const item = row.original as { id?: string; _id?: string };
        return item._id || item.id || "";
      })
      .filter(Boolean);
    onBulkDelete?.(selectedIds);
    setRowSelection({});
  };

  return (
    <div className="w-full">
      {/* Top Bar: Search & Filters */}
      <div className="flex flex-wrap justify-between items-center gap-2 pb-4">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {showSearch && (
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              disabled={isLoading}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full sm:max-w-sm"
            />
          )}
          {filters.map(({ key, label, options }) => (
            <Select
              key={key}
              value={filterValues[key] ?? ""}
              disabled={isLoading}
              onValueChange={(value) => handleFilterChange(key, value)}
            >
              <SelectTrigger className="min-w-[160px]">
                <div className="flex items-center gap-2">
                  <PlusCircleIcon className="h-4 w-4 opacity-50" />
                  <SelectValue placeholder={label} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}

          {(searchTerm ||
            Object.keys(rowSelection).length > 0 ||
            Object.keys(filterValues).length > 0) && (
              <Button
                variant="ghost"
                disabled={isLoading || isBulkDeleting}
                onClick={handleClear}
                className="h-8 px-2"
              >
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
        </div>

        {(selection && hasSelections) || isBulkDeleting ? (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-[#f5f5f7]">
              <span className="text-[#8e8e93]">Selected:</span>
              <span className="font-medium text-white tabular-nums">{selectedRows.length}</span>
              {selectedSum !== null && (
                <>
                  <span className="text-neutral-600">•</span>
                  <span className="text-[#8e8e93]">Net:</span>
                  <span
                    className={cn(
                      "tabular-nums font-medium",
                      selectedSum >= 0 ? "text-[#30d158]" : "text-[#ff453a]"
                    )}
                  >
                    {selectedSum >= 0 ? "+" : ""}
                    {selectedSum.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCsv(selectedRows)}
              disabled={isLoading || isBulkDeleting}
              className="h-8 border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white cursor-pointer rounded-xl text-xs active:scale-[0.97] transition-all"
              title="Download selected rows as CSV"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-[#e5c158]" />
              Export ({selectedRows.length})
            </Button>

            <Button
              disabled={isLoading || isBulkDeleting}
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="h-8 rounded-xl text-xs active:scale-[0.97] transition-all"
            >
              <Trash className="h-3.5 w-3.5 mr-1" />
              Delete ({selectedRows.length})
              {isBulkDeleting && <Loader className="ml-1 h-3.5 w-3.5 animate-spin" />}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Table */}
      <div className={cn("obsidian-card rounded-2xl overflow-hidden", className)}>
        {isLoading ? (
          <TableSkeleton columns={6} rows={20} />
        ) : (
          <Table
            className={cn(
              table.getRowModel().rows.length === 0 ? "h-[200px]" : ""
            )}
          >
            <TableHeader className="sticky top-0 bg-[#0e0e13]/90 backdrop-blur-xl z-10 border-b border-white/[0.08]">
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id} className="border-b border-white/[0.06] hover:bg-transparent">
                  {group.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        "!font-medium !text-xs !text-[#8e8e93]",
                        (header.column.columnDef.meta as { className?: string })?.className
                      )}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "!text-[13.3px]",
                          (cell.column.columnDef.meta as { className?: string })?.className
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center h-24"
                  >
                    <EmptyState title="No records found" description="" />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {isShowPagination && (
        <div className="mt-6 pb-2 border-t border-white/[0.08] pt-4">
          <DataTablePagination
            pageNumber={pagination?.pageNumber || 1}
            pageSize={pagination?.pageSize || 10}
            totalCount={pagination?.totalItems || 0}
            totalPages={pagination?.totalPages || 0}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
}
