import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { Env } from "./env.config";
import multer from "multer";

cloudinary.config({
  cloud_name: Env.CLOUDINARY_CLOUD_NAME,
  api_key: Env.CLOUDINARY_API_KEY,
  api_secret: Env.CLOUDINARY_API_SECRET,
});

const STORAGE_PARAMS = {
  folder: "images",
  allowed_formats: ["jpg", "png", "jpeg"],
  resource_type: "image" as const,
  quality: "auto:good" as const,
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: () => ({
    ...STORAGE_PARAMS,
  }),
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_, file, cb) => {
    const isValid = /^image\/(jpe?g|png)$/i.test(file.mimetype);
    if (!isValid) {
      cb(new Error("Invalid file format. Only JPG, JPEG, and PNG are allowed."));
      return;
    }

    cb(null, true);
  },
});

export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  folder: string = "receipts"
): Promise<string> => {
  if (
    !Env.CLOUDINARY_CLOUD_NAME ||
    !Env.CLOUDINARY_API_KEY ||
    !Env.CLOUDINARY_API_SECRET
  ) {
    return "";
  }
  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result) {
          console.warn("[Cloudinary] Upload notice:", error?.message || error);
          resolve("");
        } else {
          resolve(result.secure_url || "");
        }
      }
    );
    uploadStream.end(buffer);
  });
};
