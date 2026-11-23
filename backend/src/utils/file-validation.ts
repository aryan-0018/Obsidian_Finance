import { BadRequestException } from "./app-error";

export const hasPdfSignature = (buf: Buffer): boolean => {
  if (!buf || buf.length < 5) return false;
  return buf.subarray(0, 5).toString("ascii") === "%PDF-";
};

export const hasJpegSignature = (buf: Buffer): boolean => {
  if (!buf || buf.length < 3) return false;
  return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
};

export const hasPngSignature = (buf: Buffer): boolean => {
  if (!buf || buf.length < 8) return false;
  return (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
};

export const hasWebpSignature = (buf: Buffer): boolean => {
  if (!buf || buf.length < 12) return false;
  return (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  );
};

export const hasHeicSignature = (buf: Buffer): boolean => {
  if (!buf || buf.length < 12) return false;
  const box = buf.subarray(4, 8).toString("ascii");
  const brand = buf.subarray(8, 12).toString("ascii");
  return box === "ftyp" && /^(heic|heix|hevc|hevx|mif1|msf1)$/i.test(brand);
};

export const isLikelyTextCsv = (buf: Buffer): boolean => {
  if (!buf || buf.length === 0) return false;
  const sample = buf.subarray(0, Math.min(buf.length, 4096));
  // Reject NUL bytes (binary executable/image masquerading as CSV/TXT)
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return false;
  }
  return true;
};

export const assertValidStatementFile = (
  buf: Buffer,
  typeOrIsPdf: boolean | "PDF" | "CSV" | "IMAGE"
): void => {
  if (typeOrIsPdf === true || typeOrIsPdf === "PDF") {
    if (!hasPdfSignature(buf)) {
      throw new BadRequestException("Invalid PDF file signature.");
    }
    return;
  }
  if (typeOrIsPdf === "IMAGE") {
    const isSupportedImage =
      hasJpegSignature(buf) ||
      hasPngSignature(buf) ||
      hasWebpSignature(buf) ||
      hasHeicSignature(buf);
    if (!isSupportedImage) {
      throw new BadRequestException(
        "Invalid image file signature. Only PNG, JPG, WEBP, or HEIC images are supported."
      );
    }
    return;
  }
  if (!isLikelyTextCsv(buf)) {
    throw new BadRequestException("Invalid CSV/text statement content.");
  }
};

export const assertValidReceiptFile = (
  buf: Buffer,
  isPdf: boolean
): void => {
  if (isPdf) {
    if (!hasPdfSignature(buf)) {
      throw new BadRequestException("Invalid PDF receipt file signature.");
    }
    return;
  }

  const isSupportedImage =
    hasJpegSignature(buf) ||
    hasPngSignature(buf) ||
    hasWebpSignature(buf) ||
    hasHeicSignature(buf);

  if (!isSupportedImage) {
    throw new BadRequestException(
      "Invalid image file signature. Only JPG, PNG, WEBP, HEIC, or PDF receipts are allowed."
    );
  }
};
