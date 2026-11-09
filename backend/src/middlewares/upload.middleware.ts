import multer from "multer";

const memoryStorage = multer.memoryStorage();

export const statementUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max for large statements
    files: 1,
  },
  fileFilter: (_, file, cb) => {
    const isAllowed =
      file.mimetype === "application/pdf" ||
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.match(/\.(pdf|csv|txt)$/i);

    if (!isAllowed) {
      return cb(
        new Error(
          "Invalid statement format. Please upload a PDF or CSV bank statement."
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
    const isImageOrPdf =
      /^image\/(jpe?g|png|webp|heic)$/i.test(file.mimetype) ||
      file.mimetype === "application/pdf" ||
      file.originalname.match(/\.(jpe?g|png|webp|heic|pdf)$/i);

    if (!isImageOrPdf) {
      return cb(
        new Error(
          "Invalid receipt format. Please upload a JPG, PNG, WEBP, or PDF receipt."
        )
      );
    }
    cb(null, true);
  },
});

