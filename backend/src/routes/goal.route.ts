import { Router } from "express";
import {
  contributeGoalController,
  createGoalController,
  deleteGoalController,
  getAllGoalsController,
  updateGoalController,
} from "../controllers/goal.controller";

const goalRoutes = Router();

goalRoutes.get("/all", getAllGoalsController);
goalRoutes.post("/create", createGoalController);
goalRoutes.put("/update/:id", updateGoalController);
goalRoutes.post("/:id/contribute", contributeGoalController);
goalRoutes.delete("/delete/:id", deleteGoalController);

export default goalRoutes;
