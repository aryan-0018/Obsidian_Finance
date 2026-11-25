import { Router } from "express";
import {
  createAccountController,
  deleteAccountController,
  getAllAccountsController,
  transferAccountsController,
  updateAccountController,
} from "../controllers/account.controller";

const accountRoutes = Router();

accountRoutes.get("/all", getAllAccountsController);
accountRoutes.post("/create", createAccountController);
accountRoutes.post("/transfer", transferAccountsController);
accountRoutes.put("/update/:id", updateAccountController);
accountRoutes.delete("/delete/:id", deleteAccountController);

export default accountRoutes;
