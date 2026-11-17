import { Router } from "express";
import {
  getCurrentUserController,
  updateUserController,
  getTelegramStatusController,
  generateTelegramPairCodeController,
  unlinkTelegramController,
  getUserApiKeyStatusController,
  generateUserApiKeyController,
  revokeUserApiKeyController,
} from "../controllers/user.controller";
import { upload } from "../config/cloudinary.config";

const userRoutes = Router();

userRoutes.get("/current-user", getCurrentUserController);
userRoutes.put(
  "/update",
  upload.single("profilePicture"),
  updateUserController
);

userRoutes.get("/telegram/status", getTelegramStatusController);
userRoutes.post("/telegram/pair-code", generateTelegramPairCodeController);
userRoutes.delete("/telegram/unlink", unlinkTelegramController);

userRoutes.get("/api-key", getUserApiKeyStatusController);
userRoutes.post("/api-key", generateUserApiKeyController);
userRoutes.delete("/api-key", revokeUserApiKeyController);

export default userRoutes;
