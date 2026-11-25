import { Router } from "express";
import {
  createSplitController,
  deleteSplitController,
  getAllSplitsController,
  settleSplitController,
} from "../controllers/split.controller";

const splitRoutes = Router();

splitRoutes.get("/all", getAllSplitsController);
splitRoutes.post("/create", createSplitController);
splitRoutes.post("/:id/settle", settleSplitController);
splitRoutes.delete("/delete/:id", deleteSplitController);

export default splitRoutes;
