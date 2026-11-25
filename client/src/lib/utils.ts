import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "data" in err &&
    typeof (err as { data?: { message?: unknown } }).data?.message === "string"
  ) {
    return (err as { data: { message: string } }).data.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
