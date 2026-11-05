import { Router } from "express";
import {
  loginController,
  registerController,
  googleLoginController,
  refreshTokenController,
  logoutController,
} from "../controllers/auth.controller";

const authRoutes = Router();

authRoutes.post("/register", registerController);
authRoutes.post("/login", loginController);
authRoutes.post("/google", googleLoginController);
authRoutes.post("/refresh-token", refreshTokenController);
authRoutes.post("/logout", logoutController);

export default authRoutes;
