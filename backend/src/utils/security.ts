import crypto from "crypto";

/**
 * Escapes all RegExp metacharacters in untrusted user input before compiling a
 * RegExp or passing to MongoDB `$regex` queries.
 */
export const escapeRegex = (input: string): string => {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
};

/**
 * Escapes HTML special characters for safe interpolation in HTML emails,
 * Telegram `HTML` parse-mode messages, and HTML templates.
 */
export const escapeHtml = (input: unknown): string => {
  return String(input ?? "").replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
};

/**
 * Neutralizes spreadsheet formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`)
 * and wraps values cleanly in RFC 4180 CSV double quotes.
 */
export const sanitizeCsvCell = (val: unknown): string => {
  let str = String(val ?? "");
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
};

/**
 * Accepts only HTTP/HTTPS URLs so `javascript:`, `data:`, or arbitrary schemes
 * cannot be stored or rendered as clickable links.
 */
export const isSafeHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Constant-time SHA-256 hex digest helper.
 */
export const sha256Hex = (value: string): string => {
  return crypto.createHash("sha256").update(value).digest("hex");
};
