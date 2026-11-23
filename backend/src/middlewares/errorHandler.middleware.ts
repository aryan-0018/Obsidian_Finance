import { Response, ErrorRequestHandler } from "express";
import { z, ZodError } from "zod";
import { HTTPSTATUS } from "../config/http.config";
import { AppError } from "../utils/app-error";
import { ErrorCodeEnum } from "../enums/error-code.enum";
import { MulterError } from "multer";

const formatZodError = (res: Response, error: z.ZodError) => {
  const errors = error?.issues?.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
  return res.status(HTTPSTATUS.BAD_REQUEST).json({
    message: "Validation failed",
    errors,
    errorCode: ErrorCodeEnum.VALIDATION_ERROR,
  });
};

const handleMulterError = (error: MulterError) => {
  const messages = {
    LIMIT_UNEXPECTED_FILE: "Invalid file field name",
    LIMIT_FILE_SIZE: "File size exceeds the limit",
    LIMIT_FILE_COUNT: "Too many files uploaded",
    default: "File upload error",
  };

  return {
    status: HTTPSTATUS.BAD_REQUEST,
    message: messages[error.code as keyof typeof messages] || messages.default,
    error: error.message,
  };
};

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  _next
): any => {
  console.error(`[Error] ${req.method} ${req.path}:`, error?.message || error);

  if (error instanceof ZodError) {
    return formatZodError(res, error);
  }

  if (error instanceof MulterError) {
    const { status, message, error: err } = handleMulterError(error);
    return res.status(status).json({
      message,
      error: err,
      errorCode: ErrorCodeEnum.FILE_UPLOAD_ERROR,
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      message: error.message,
      errorCode: error.errorCode,
    });
  }

  if (error?.name === "CastError") {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      message: `Invalid identifier format for ${error.path || "parameter"}`,
      errorCode: ErrorCodeEnum.VALIDATION_ERROR,
    });
  }

  if (error?.name === "ValidationError") {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      message: error.message || "Database validation failed",
      errorCode: ErrorCodeEnum.VALIDATION_ERROR,
    });
  }

  if (error?.code === 11000) {
    const fields = error.keyPattern ? Object.keys(error.keyPattern).join(", ") : "field";
    return res.status(HTTPSTATUS.CONFLICT).json({
      message: `Duplicate value for ${fields}`,
      errorCode: ErrorCodeEnum.VALIDATION_ERROR,
    });
  }

  if (
    error?.name === "MongoServerSelectionError" ||
    error?.name === "MongoNetworkError" ||
    error?.cause?.code === "ENOTFOUND" ||
    error?.code === "ENOTFOUND"
  ) {
    return res.status(HTTPSTATUS.SERVICE_UNAVAILABLE).json({
      message:
        "Database is temporarily unreachable. Please check your network/internet connection and try again.",
      errorCode: "DATABASE_UNAVAILABLE",
    });
  }

  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "production"
        ? "An internal server error occurred"
        : error?.message || "Unknown error occurred",
  });
};
