import multer from "multer";
import { BadRequestException } from "../utils/app-error";

const memoryStorage = multer.memoryStorage();

export const statementUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max for large statements
    files: 1,
  },
  fileFilter: (_, file, cb) => {
    const extAllowed = /\.(pdf|csv|txt|png|jpe?g|webp|heic)$/i.test(
      file.originalname || ""
    );
    const mimeAllowed = [
      "application/pdf",
      "text/csv",
      "text/plain",
      "application/csv",
      "application/vnd.ms-excel",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
    ].includes((file.mimetype || "").toLowerCase());

    if (!extAllowed || !mimeAllowed) {
      return cb(
        new BadRequestException(
          "Invalid statement format. Please upload a PDF, CSV, or statement screenshot image (PNG/JPG/WEBP/HEIC)."
        )
      );
    }
    cb(null, true);
  },
});

export const receiptMemoryUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
    files: 1,
  },
  fileFilter: (_, file, cb) => {
    const extAllowed = /\.(jpe?g|png|webp|heic|pdf)$/i.test(
      file.originalname || ""
    );
    const mimeAllowed =
      /^image\/(jpe?g|png|webp|heic)$/i.test(file.mimetype || "") ||
      (file.mimetype || "").toLowerCase() === "application/pdf";

    if (!extAllowed || !mimeAllowed) {
      return cb(
        new BadRequestException(
          "Invalid receipt format. Please upload a valid JPG, PNG, WEBP, HEIC, or PDF receipt."
        )
      );
    }
    cb(null, true);
  },
});
