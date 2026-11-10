import { useMemo, useState } from "react";
import {
  BanIcon,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CsvColumn, TransactionField } from "@/@types/transaction.type";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ColumnMappingStepProps = {
  csvColumns: CsvColumn[];
  transactionFields: TransactionField[];
  mappings: Record<string, string>;
  onComplete: (mappings: Record<string, string>) => void;
  onBack: () => void;
};

type AvailableAttributeType =
  | { fieldName: string; required?: never }
  | TransactionField;

const ColumnMappingStep = ({
  csvColumns,
  transactionFields,
  onComplete,
  onBack,
  ...props
}: ColumnMappingStepProps) => {
  const [mappings, setMappings] = useState<Record<string, string>>(
    props.mappings || {}
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const availableAttributes: AvailableAttributeType[] = useMemo(
    () => [{ fieldName: "Skip" }, ...transactionFields],
    [transactionFields]
  );

  const handleMappingChange = (csvColumn: string, field: string) => {
    setMappings((prev) => ({
      ...prev,
      [csvColumn]: field,
    }));

    if (errors[csvColumn]) {
      const updated = { ...errors };
      delete updated[csvColumn];
      setErrors(updated);
    }
  };

  const validateMappings = () => {
    const newErrors: Record<string, string> = {};
    const usedFields = new Set<string>();

    Object.entries(mappings).forEach(([csvColumn, field]) => {
      if (field !== "Skip" && usedFields.has(field)) {
        newErrors[csvColumn] = "Field already mapped to another column";
      }
      if (field !== "Skip") usedFields.add(field);
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const finalMappings = Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(mappings).filter(([_, field]) => field !== "Skip")
      );
      onComplete(finalMappings);
    }
  };

  const requiredFields = transactionFields.filter((f) => f.required);
  const mappedRequiredCount = requiredFields.filter((f) =>
    Object.values(mappings).includes(f.fieldName)
  ).length;
  const hasRequiredMappings = mappedRequiredCount === requiredFields.length;

  const validMappingsCount = Object.values(mappings).filter(
    (field) => field && field !== "Skip"
  ).length;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div>
          <h4 className="text-sm font-semibold text-white tracking-tight">Match Columns</h4>
          <p className="text-xs text-[#8e8e93]">
            Map headers from your CSV to required transaction fields.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-xs font-mono px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-300">
            {validMappingsCount} mapped
          </div>
          <div
            className={`text-xs font-medium px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
              hasRequiredMappings
                ? "bg-[#e5c158]/15 border-[#e5c158]/35 text-[#f5cf6d]"
                : "bg-rose-500/10 border-rose-500/25 text-rose-300"
            }`}
          >
            {hasRequiredMappings ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <AlertCircle className="size-3.5" />
            )}
            Required: {mappedRequiredCount}/{requiredFields.length}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0e] overflow-hidden max-h-[360px] overflow-y-auto">
        <Table className="w-full text-xs">
          <TableHeader className="bg-[#141419] sticky top-0 border-b border-white/[0.08] z-10">
            <TableRow className="border-b border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-[#8e8e93] text-xs font-medium py-3 px-4">
                Column in Your File
              </TableHead>
              <TableHead className="text-[#8e8e93] text-xs font-medium py-3 px-4">
                Map To Field
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-white/[0.04]">
            {csvColumns.map((column) => {
              const currentField = mappings[column.name] || "";
              const isMapped = currentField && currentField !== "Skip";
              const hasError = !!errors[column.name];

              return (
                <TableRow
                  key={column.id}
                  className={`hover:bg-white/[0.02] border-white/[0.04] transition-colors ${
                    hasError ? "bg-rose-500/[0.06]" : ""
                  }`}
                >
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl border transition-colors ${
                          isMapped
                            ? "bg-[#e5c158]/15 text-[#f5cf6d] border-[#e5c158]/30"
                            : "bg-white/[0.04] text-neutral-400 border-white/[0.06]"
                        }`}
                      >
                        <FileSpreadsheet className="size-4" />
                      </div>
                      <div>
                        <span className="font-medium text-white text-xs">
                          {column.name}
                        </span>
                        {column.sampleData && (
                          <p className="text-[11px] text-[#8e8e93] font-mono truncate max-w-[220px] mt-0.5">
                            sample: "{column.sampleData}"
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-4">
                    <div className="w-full max-w-[240px]">
                      <Select
                        value={currentField}
                        onValueChange={(value) =>
                          handleMappingChange(column.name, value)
                        }
                      >
                        <SelectTrigger className="h-9 rounded-xl bg-[#161616]/80 border-white/[0.08] text-xs text-white hover:bg-white/[0.07] focus:ring-[#e5c158]">
                          <SelectValue
                            className="text-white capitalize"
                            placeholder="Select field"
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-[#141419] border border-white/[0.12] text-white rounded-2xl shadow-2xl">
                          {availableAttributes.map((attr) => {
                            const isDisabled =
                              attr.fieldName !== "Skip" &&
                              attr.fieldName !== currentField &&
                              Object.values(mappings).includes(attr.fieldName);

                            return (
                              <SelectItem
                                key={attr.fieldName}
                                value={attr.fieldName}
                                disabled={isDisabled}
                                className="text-xs text-white focus:bg-white/[0.08] focus:text-white capitalize cursor-pointer rounded-xl my-0.5"
                              >
                                <span className="flex items-center justify-between w-full gap-2">
                                  <span className="flex items-center gap-1">
                                    {attr.fieldName}
                                    {attr?.required && (
                                      <span className="text-rose-400 font-bold">*</span>
                                    )}
                                  </span>
                                  {isDisabled && (
                                    <BanIcon className="size-3.5 text-neutral-500" />
                                  )}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {errors[column.name] && (
                        <p className="text-[11px] text-rose-400 mt-1 pl-1">
                          {errors[column.name]}
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <Button
          variant="ghost"
          onClick={onBack}
          className="rounded-xl text-[#8e8e93] hover:text-white"
        >
          <ChevronLeft className="size-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={validateMappings}
          disabled={!hasRequiredMappings || hasErrors}
          className="cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] active:scale-[0.98] transition-all"
        >
          Review Import
          <ChevronRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
};

export default ColumnMappingStep;
