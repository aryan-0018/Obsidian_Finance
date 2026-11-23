import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { Env } from "./env.config";
import multer from "multer";
import { BadRequestException } from "../utils/app-error";

const isCloudinaryConfigured = Boolean(
  Env.CLOUDINARY_CLOUD_NAME &&
    Env.CLOUDINARY_API_KEY &&
    Env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: Env.CLOUDINARY_CLOUD_NAME,
    api_key: Env.CLOUDINARY_API_KEY,
    api_secret: Env.CLOUDINARY_API_SECRET,
  });
}

const STORAGE_PARAMS = {
  folder: "images",
  allowed_formats: ["jpg", "png", "jpeg"],
  resource_type: "image" as const,
  quality: "auto:good" as const,
};

const storage = isCloudinaryConfigured
  ? new CloudinaryStorage({
      cloudinary,
      params: () => ({
        ...STORAGE_PARAMS,
      }),
    })
  : multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_, file, cb) => {
    const extValid = /\.(jpe?g|png)$/i.test(file.originalname || "");
    const mimeValid = /^image\/(jpe?g|png)$/i.test(file.mimetype || "");
    if (!extValid || !mimeValid) {
      cb(
        new BadRequestException(
          "Invalid file format. Only JPG, JPEG, and PNG images are allowed."
        )
      );
      return;
    }

    cb(null, true);
  },
});

export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  folder: string = "receipts"
): Promise<string> => {
  if (!isCloudinaryConfigured) {
    return "";
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (url: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(url);
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result) {
          console.warn("[Cloudinary] Upload notice:", error?.message || error);
          finish("");
        } else {
          finish(result.secure_url || "");
        }
      }
    );

    const timer = setTimeout(() => {
      console.warn("[Cloudinary] Upload timed out after 6000ms");
      try {
        uploadStream.destroy();
      } catch {
        // ignore
      }
      finish("");
    }, 6000);

    uploadStream.end(buffer);
  });
};
