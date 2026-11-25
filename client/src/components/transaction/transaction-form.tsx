import * as z from "zod";
import { useEffect, useState } from "react";
import { Calendar, Loader } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import RecieptScanner from "./reciept-scanner";
import {
  _TRANSACTION_FREQUENCY,
  _TRANSACTION_TYPE,
  CATEGORIES,
  PAYMENT_METHODS,
} from "@/constant";
import { Switch } from "../ui/switch";
import CurrencyInputField from "../ui/currency-input";
import { SingleSelector } from "../ui/single-select";
import { AIScanReceiptData } from "@/features/transaction/transationType";
import {
  useCreateTransactionMutation,
  useGetSingleTransactionQuery,
  useUpdateTransactionMutation,
} from "@/features/transaction/transactionAPI";
import { useGetAllAccountsQuery } from "@/features/account/accountAPI";
import { toast } from "sonner";

const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0.01, {
    message: "Amount must be at least 0.01.",
  }),
  type: z.enum([
    _TRANSACTION_TYPE.INCOME,
    _TRANSACTION_TYPE.EXPENSE,
    _TRANSACTION_TYPE.TRANSFER,
  ]),
  category: z.string().min(1, { message: "Please select a category." }),
  date: z.date({
    required_error: "Please select a date.",
  }),
  paymentMethod: z
    .string()
    .min(1, { message: "Please select a payment method." }),
  accountId: z.string().nullable().optional(),
  toAccountId: z.string().nullable().optional(),
  isRecurring: z.boolean(),
  frequency: z
    .enum([
      _TRANSACTION_FREQUENCY.DAILY,
      _TRANSACTION_FREQUENCY.WEEKLY,
      _TRANSACTION_FREQUENCY.MONTHLY,
      _TRANSACTION_FREQUENCY.YEARLY,
    ])
    .nullable()
    .optional(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TransactionForm = (props: {
  isEdit?: boolean;
  transactionId?: string;
  onCloseDrawer?: () => void;
}) => {
  const { onCloseDrawer, isEdit = false, transactionId } = props;

  const [isScanning, setIsScanning] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { data, isLoading } = useGetSingleTransactionQuery(
    transactionId || "",
    { skip: !transactionId }
  );
  const editData = data?.transaction;

  const { data: accountsData } = useGetAllAccountsQuery();
  const accounts = accountsData?.accounts || [];

  const [createTransaction, { isLoading: isCreating }] =
    useCreateTransactionMutation();

  const [updateTransaction, { isLoading: isUpdating }] =
    useUpdateTransactionMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: "",
      type: _TRANSACTION_TYPE.INCOME,
      category: "",
      date: new Date(),
      paymentMethod: "",
      accountId: null,
      toAccountId: null,
      isRecurring: false,
      frequency: null,
      description: "",
      receiptUrl: "",
    },
  });

  const watchedType = form.watch("type");

  useEffect(() => {
    if (isEdit && transactionId && editData) {
      const accId =
        editData.accountId && typeof editData.accountId === "object"
          ? editData.accountId._id
          : (editData.accountId as string | null) || null;
      const toAccId =
        editData.toAccountId && typeof editData.toAccountId === "object"
          ? editData.toAccountId._id
          : (editData.toAccountId as string | null) || null;

      form.reset({
        title: editData?.title,
        amount: editData.amount.toString(),
        type: editData.type,
        category: editData.category?.toLowerCase(),
        date: new Date(editData.date),
        paymentMethod: editData.paymentMethod,
        accountId: accId,
        toAccountId: toAccId,
        isRecurring: editData.isRecurring,
        frequency: editData.recurringInterval,
        description: editData.description,
        receiptUrl: editData.receiptUrl || "",
      });
    }
  }, [editData, form, isEdit, transactionId]);

  const frequencyOptions = Object.entries(_TRANSACTION_FREQUENCY).map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ([_, value]) => ({
      value: value,
      label: value.replace("_", " ").toLowerCase(),
    })
  );

  const handleScanComplete = (data: AIScanReceiptData) => {
    form.setValue("title", data.title || "Scanned Receipt", {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("amount", data.amount ? data.amount.toString() : "0", {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("type", data.type || _TRANSACTION_TYPE.EXPENSE, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("category", data.category?.toLowerCase() || "shopping", {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("date", data.date ? new Date(data.date) : new Date(), {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("paymentMethod", data.paymentMethod || "CARD", {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue(
      "description",
      data.description || "Scanned receipt",
      {
        shouldValidate: true,
        shouldDirty: true,
      }
    );
    if (data.receiptUrl) {
      form.setValue("receiptUrl", data.receiptUrl, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    const d = new Date(values.date);
    const utcNoonIso = new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0)
    ).toISOString();

    if (values.type === _TRANSACTION_TYPE.TRANSFER) {
      if (!values.accountId || !values.toAccountId) {
        toast.error("Please select both source and destination accounts");
        return;
      }
      if (values.accountId === values.toAccountId) {
        toast.error("Source and destination accounts must be different");
        return;
      }
    }

    const payload = {
      title: values.title,
      type: values.type,
      category: values.category,
      paymentMethod: values.paymentMethod,
      description: values.description || "",
      amount: Number(values.amount),
      date: utcNoonIso,
      accountId: values.accountId || null,
      toAccountId:
        values.type === _TRANSACTION_TYPE.TRANSFER
          ? values.toAccountId || null
          : null,
      isRecurring: values.isRecurring || false,
      recurringInterval: values.isRecurring ? values.frequency || null : null,
      receiptUrl: values.receiptUrl || undefined,
    };
    if (isEdit && transactionId) {
      updateTransaction({ id: transactionId, transaction: payload })
        .unwrap()
        .then(() => {
          onCloseDrawer?.();
          toast.success("Transaction updated successfully");
        })
        .catch((error) => {
          toast.error(error?.data?.message || "Failed to update transaction");
        });
      return;
    }
    createTransaction(payload)
      .unwrap()
      .then(() => {
        form.reset();
        onCloseDrawer?.();
        toast.success("Transaction created successfully");
      })
      .catch((error) => {
        toast.error(error?.data?.message || "Failed to create transaction");
      });
  };

  return (
    <div className="relative pb-10 pt-5 px-2.5">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-4">
          <div className="space-y-6">
            {/* Receipt Upload Section */}
            {!isEdit && (
              <RecieptScanner
                loadingChange={isScanning}
                onLoadingChange={setIsScanning}
                onScanComplete={handleScanComplete}
              />
            )}

            {/* Segmented Control: Transaction Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-[#8e8e93]">
                    Transaction Type
                  </FormLabel>
                  <div className="flex p-1 rounded-xl bg-black/60 border border-white/[0.08] select-none">
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => field.onChange(_TRANSACTION_TYPE.EXPENSE)}
                      className={cn(
                        "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]",
                        field.value === _TRANSACTION_TYPE.EXPENSE
                          ? "bg-[#ff453a] text-white shadow-[0_2px_10px_rgba(255,69,58,0.35)]"
                          : "text-[#8e8e93] hover:text-white hover:bg-white/5"
                      )}
                    >
                      <span>- Expense</span>
                    </button>
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => field.onChange(_TRANSACTION_TYPE.INCOME)}
                      className={cn(
                        "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]",
                        field.value === _TRANSACTION_TYPE.INCOME
                          ? "bg-[#30d158] text-black shadow-[0_2px_10px_rgba(48,209,88,0.35)] font-semibold"
                          : "text-[#8e8e93] hover:text-white hover:bg-white/5"
                      )}
                    >
                      <span>+ Income</span>
                    </button>
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => {
                        field.onChange(_TRANSACTION_TYPE.TRANSFER);
                        if (!form.getValues("category")) {
                          form.setValue("category", "transfer");
                        }
                        if (!form.getValues("paymentMethod")) {
                          form.setValue("paymentMethod", "BANK_TRANSFER");
                        }
                      }}
                      className={cn(
                        "flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]",
                        field.value === _TRANSACTION_TYPE.TRANSFER
                          ? "bg-white/[0.14] text-[#fcfcfc] border border-white/[0.18]"
                          : "text-[#8e8e93] hover:text-white hover:bg-white/5"
                      )}
                    >
                      <span>⇄ Transfer</span>
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Linked Account / Transfer Wallets */}
            {accounts.length > 0 && (
              <div className={cn("grid gap-3", watchedType === _TRANSACTION_TYPE.TRANSFER ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#8e8e93]">
                        {watchedType === _TRANSACTION_TYPE.TRANSFER
                          ? "From Account"
                          : "Account / Wallet (Optional)"}
                      </FormLabel>
                      <Select
                        value={field.value || "none"}
                        onValueChange={(val) =>
                          field.onChange(val === "none" ? null : val)
                        }
                        disabled={isScanning}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-black/40 border-white/[0.08]">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {watchedType !== _TRANSACTION_TYPE.TRANSFER && (
                            <SelectItem value="none">No linked account</SelectItem>
                          )}
                          {accounts.map((acc) => (
                            <SelectItem key={acc._id} value={acc._id}>
                              {acc.name}
                              {acc.accountMask ? ` (••${acc.accountMask})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {watchedType === _TRANSACTION_TYPE.TRANSFER && (
                  <FormField
                    control={form.control}
                    name="toAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-[#8e8e93]">
                          To Account
                        </FormLabel>
                        <Select
                          value={field.value || "none"}
                          onValueChange={(val) =>
                            field.onChange(val === "none" ? null : val)
                          }
                          disabled={isScanning}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-black/40 border-white/[0.08]">
                              <SelectValue placeholder="Select destination" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc._id} value={acc._id}>
                                {acc.name}
                                {acc.accountMask ? ` (••${acc.accountMask})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="!font-normal">Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Transaction title"
                      {...field}
                      disabled={isScanning}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <CurrencyInputField
                        {...field}
                        disabled={isScanning}
                        onValueChange={(value) => field.onChange(value || "")}
                        placeholder="₹0.00"
                        prefix="₹"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <SingleSelector
                    value={
                      CATEGORIES.find((opt) => opt.value === field.value) ||
                        field.value
                        ? { value: field.value, label: field.value }
                        : undefined
                    }
                    onChange={(option) => field.onChange(option.value)}
                    options={CATEGORIES}
                    placeholder="Select or type a category"
                    creatable
                    disabled={isScanning}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => {
                const currentDate =
                  field.value instanceof Date && !isNaN(field.value.getTime())
                    ? field.value
                    : field.value
                    ? new Date(field.value)
                    : new Date();

                const handleDateSelect = (selectedDate: Date | undefined) => {
                  if (selectedDate) {
                    const d = new Date(selectedDate);
                    d.setHours(12, 0, 0, 0);
                    field.onChange(d);
                    setIsCalendarOpen(false);
                  }
                };

                return (
                  <FormItem className="flex flex-col space-y-2">
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Button
                        type="button"
                        variant={"outline"}
                        onClick={() => setIsCalendarOpen((prev) => !prev)}
                        className={cn(
                          "w-full pl-3 text-left font-normal cursor-pointer flex items-center justify-between border-white/[0.10] bg-white/[0.03] text-white hover:bg-white/[0.06] hover:text-[#e5c158]",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <span>
                          {currentDate ? format(currentDate, "PPP") : "Pick a date"}
                        </span>
                        <Calendar className="ml-auto h-4 w-4 opacity-70 text-[#e5c158]" />
                      </Button>
                    </FormControl>

                    {isCalendarOpen && (
                      <div
                        className="rounded-xl border border-white/[0.10] bg-[#0b0b0e] p-3 flex flex-col items-center justify-center shadow-xl transition-all duration-200 animate-in fade-in-0 zoom-in-95"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <CalendarComponent
                          mode="single"
                          selected={currentDate}
                          onSelect={handleDateSelect}
                          onDayClick={handleDateSelect}
                          className="rounded-xl border border-white/[0.08] p-2 bg-[#070709]"
                        />
                        <div className="w-full flex justify-end pt-2 pr-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-white cursor-pointer"
                            onClick={() => setIsCalendarOpen(false)}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isScanning}
                  >
                    <FormControl className="w-full">
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-[14.5px]">
                      Recurring Transaction
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      {field.value
                        ? "This will repeat automatically"
                        : "Set recurring to repeat this transaction"}
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      disabled={isScanning}
                      checked={field.value}
                      className="cursor-pointer"
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) {
                          form.setValue(
                            "frequency",
                            _TRANSACTION_FREQUENCY.DAILY
                          );
                        } else {
                          form.setValue("frequency", null);
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("isRecurring") && form.getValues().isRecurring && (
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem className="recurring-control">
                    <FormLabel>Frequency</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                      disabled={isScanning}
                    >
                      <FormControl className="w-full">
                        <SelectTrigger>
                          <SelectValue
                            placeholder="Select frequency"
                            className="!capitalize"
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {frequencyOptions.map(({ value, label }) => (
                          <SelectItem
                            key={value}
                            value={value}
                            className="!capitalize"
                          >
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add notes about this transaction"
                      className="resize-none"
                      disabled={isScanning}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="sticky bottom-0 bg-[#0e0e13]/95 backdrop-blur-xl pt-3 pb-2 border-t border-white/[0.06]">
            <Button
              type="submit"
              className="w-full h-10 cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] text-sm"
              disabled={isScanning || isCreating || isUpdating}
            >
              {isCreating || isUpdating ? (
                <Loader className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEdit ? "Update Transaction" : "Save Transaction"}
            </Button>
          </div>

          {isLoading && (
            <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/70 dark:bg-background/70 z-50 flex justify-center">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          )}
        </form>
      </Form>
    </div>
  );
};

export default TransactionForm;
