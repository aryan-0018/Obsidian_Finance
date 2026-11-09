import { Router } from "express";
import {
  getCurrentUserController,
  updateUserController,
  getTelegramStatusController,
  generateTelegramPairCodeController,
  unlinkTelegramController,
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

export default userRoutes;
