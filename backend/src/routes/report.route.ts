import { Router } from "express";
import {
  generateReportController,
  getAllReportsController,
  updateReportSettingController,
  resendReportController,
  createInstantReportController,
} from "../controllers/report.controller";

const reportRoutes = Router();

reportRoutes.get("/all", getAllReportsController);
reportRoutes.get("/generate", generateReportController);
reportRoutes.post("/instant", createInstantReportController);
reportRoutes.put("/update-setting", updateReportSettingController);
reportRoutes.post("/resend/:id", resendReportController);

export default reportRoutes;
