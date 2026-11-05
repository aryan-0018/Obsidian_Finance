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
